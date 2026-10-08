-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 08 Okt 2026 pada 13.54
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_peminjaman_alat`
--
CREATE DATABASE IF NOT EXISTS `db_peminjaman_alat` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `db_peminjaman_alat`;

DELIMITER $$
--
-- Prosedur
--
DROP PROCEDURE IF EXISTS `sp_ajukan_peminjaman`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ajukan_peminjaman` (IN `p_id_user` INT, IN `p_id_alat` INT, IN `p_tgl_pinjam` DATE, IN `p_tgl_kembali` DATE, IN `p_jumlah` INT, OUT `p_id_pinjam` INT, OUT `p_pesan` VARCHAR(100))   BEGIN
    DECLARE v_stok INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_pesan = 'GAGAL: terjadi kesalahan sistem';
        SET p_id_pinjam = NULL;
    END;

    START TRANSACTION;

    SELECT stok_tersedia INTO v_stok
    FROM alat WHERE id_alat = p_id_alat FOR UPDATE;

    IF v_stok IS NULL THEN
        SET p_pesan = 'GAGAL: alat tidak ditemukan';
        SET p_id_pinjam = NULL;
        ROLLBACK;
    ELSEIF v_stok < p_jumlah THEN
        SET p_pesan = CONCAT('GAGAL: stok tidak cukup (tersisa ', v_stok, ')');
        SET p_id_pinjam = NULL;
        ROLLBACK;
    ELSE
        INSERT INTO peminjaman
            (id_user, id_alat, tgl_pinjam, tgl_rencana_kembali, jumlah, status)
        VALUES
            (p_id_user, p_id_alat, p_tgl_pinjam, p_tgl_kembali, p_jumlah, 'diajukan');

        SET p_id_pinjam = LAST_INSERT_ID();
        UPDATE alat
        SET stok_tersedia = stok_tersedia - p_jumlah
        WHERE id_alat = p_id_alat;
        INSERT INTO log_aktivitas (id_user, aksi, tabel_terkait, deskripsi)
        VALUES (p_id_user, 'AJUKAN_PINJAM', 'peminjaman',
                CONCAT('Pengajuan id_pinjam=', p_id_pinjam));

        COMMIT;
        SET p_pesan = 'SUKSES: peminjaman diajukan';
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_kembalikan_alat`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_kembalikan_alat` (IN `p_id_pinjam` INT, IN `p_tgl_aktual` DATE, IN `p_kondisi` VARCHAR(20), IN `p_id_petugas` INT, OUT `p_denda` DECIMAL(10,2), OUT `p_pesan` VARCHAR(150))   BEGIN
    DECLARE v_tgl_rencana DATE;
    DECLARE v_id_alat INT;
    DECLARE v_jumlah INT;
    DECLARE v_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_pesan = 'GAGAL: terjadi kesalahan sistem';
        SET p_denda = 0;
    END;

    START TRANSACTION;

    SELECT tgl_rencana_kembali, id_alat, jumlah, status
    INTO v_tgl_rencana, v_id_alat, v_jumlah, v_status
    FROM peminjaman WHERE id_pinjam = p_id_pinjam FOR UPDATE;

    IF v_status IS NULL THEN
        SET p_pesan = 'GAGAL: peminjaman tidak ditemukan';
        SET p_denda = 0;
        ROLLBACK;
    ELSEIF v_status = 'dikembalikan' THEN
        SET p_pesan = 'GAGAL: sudah dikembalikan sebelumnya';
        SET p_denda = 0;
        ROLLBACK;
    ELSE
        SET p_denda = fn_hitung_denda(v_tgl_rencana, p_tgl_aktual);

        INSERT INTO pengembalian
            (id_pinjam, tgl_kembali, kondisi_saat_kembali, denda)
        VALUES
            (p_id_pinjam, p_tgl_aktual, p_kondisi, p_denda);

        UPDATE peminjaman
        SET tgl_kembali_aktual = p_tgl_aktual,
            status = 'dikembalikan',
            id_petugas = p_id_petugas
        WHERE id_pinjam = p_id_pinjam;

        UPDATE alat
        SET stok_tersedia = stok_tersedia + v_jumlah
        WHERE id_alat = v_id_alat;

        INSERT INTO log_aktivitas (id_user, aksi, tabel_terkait, deskripsi)
        VALUES (p_id_petugas, 'KEMBALIKAN_ALAT', 'pengembalian',
                CONCAT('id_pinjam=', p_id_pinjam, ', denda=', p_denda));

        COMMIT;
        SET p_pesan = CONCAT('SUKSES: alat dikembalikan, denda Rp', p_denda);
    END IF;
END$$

--
-- Fungsi
--
DROP FUNCTION IF EXISTS `fn_hitung_denda`$$
CREATE DEFINER=`root`@`localhost` FUNCTION `fn_hitung_denda` (`p_tgl_rencana` DATE, `p_tgl_aktual` DATE) RETURNS DECIMAL(10,2) DETERMINISTIC BEGIN
    DECLARE v_hari_telat INT;
    DECLARE v_denda DECIMAL(10,2);

    SET v_hari_telat = DATEDIFF(p_tgl_aktual, p_tgl_rencana);

    IF v_hari_telat <= 0 THEN
        SET v_denda = 0;
    ELSE
        SET v_denda = v_hari_telat * 2000;
        IF v_denda > 100000 THEN
            SET v_denda = 100000;
        END IF;
    END IF;

    RETURN v_denda;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `alat`
--

DROP TABLE IF EXISTS `alat`;
CREATE TABLE `alat` (
  `id_alat` int(11) NOT NULL,
  `kode_alat` varchar(20) NOT NULL,
  `nama_alat` varchar(100) NOT NULL,
  `id_kategori` int(11) NOT NULL,
  `stok_total` int(11) NOT NULL DEFAULT 0,
  `stok_tersedia` int(11) NOT NULL DEFAULT 0,
  `kondisi` enum('Baik','Rusak Ringan','Rusak Berat') DEFAULT 'Baik'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `alat`
--

INSERT INTO `alat` (`id_alat`, `kode_alat`, `nama_alat`, `id_kategori`, `stok_total`, `stok_tersedia`, `kondisi`) VALUES
(1, 'ALT-001', 'Proyektor Epson', 1, 5, 5, 'Baik'),
(2, 'ALT-002', 'Laptop Asus', 1, 3, 3, 'Baik'),
(3, 'ALT-003', 'Spidol Whiteboard', 2, 20, 20, 'Baik'),
(4, 'ALT-004', 'Bola Basket', 3, 4, 0, 'Baik'),
(5, 'ALT-005', 'Kamera Canon', 1, 2, 1, 'Baik'),
(6, 'ALT-06', 'TV nya Vox', 1, 8, 7, 'Baik'),
(7, 'ALT-10', 'Truck buat angkat Sawit', 3, 5, 4, 'Baik'),
(8, 'ALT-11', 'Penggaris', 2, 50, 40, 'Baik');

-- --------------------------------------------------------

--
-- Struktur dari tabel `cache`
--

DROP TABLE IF EXISTS `cache`;
CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `jobs`
--

DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `kategori`
--

DROP TABLE IF EXISTS `kategori`;
CREATE TABLE `kategori` (
  `id_kategori` int(11) NOT NULL,
  `nama_kategori` varchar(50) NOT NULL,
  `deskripsi` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `kategori`
--

INSERT INTO `kategori` (`id_kategori`, `nama_kategori`, `deskripsi`) VALUES
(1, 'Elektronik', 'Alat berbasis listrik'),
(2, 'Alat Tulis', 'Peralatan tulis kantor'),
(3, 'Olahraga', 'Peralatan olahraga'),
(4, 'Alat Berat', 'Alat yang memiliki berat di atas 10 kg'),
(7, 'Alat kebun', 'berkebunnnnnnnn');

-- --------------------------------------------------------

--
-- Struktur dari tabel `log_aktivitas`
--

DROP TABLE IF EXISTS `log_aktivitas`;
CREATE TABLE `log_aktivitas` (
  `id_log` int(11) NOT NULL,
  `id_user` int(11) DEFAULT NULL,
  `aksi` varchar(50) NOT NULL,
  `tabel_terkait` varchar(50) DEFAULT NULL,
  `deskripsi` text DEFAULT NULL,
  `waktu` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `log_aktivitas`
--

INSERT INTO `log_aktivitas` (`id_log`, `id_user`, `aksi`, `tabel_terkait`, `deskripsi`, `waktu`) VALUES
(1, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 01:39:55'),
(2, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 01:42:41'),
(3, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 01:43:41'),
(4, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 01:56:15'),
(5, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 01:57:44'),
(6, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 01:59:28'),
(7, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 01:59:52'),
(8, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 02:00:01'),
(9, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 02:16:56'),
(10, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 02:52:28'),
(11, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:12:29'),
(12, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:22:00'),
(13, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:23:27'),
(14, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:35:11'),
(15, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:35:29'),
(16, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:35:40'),
(17, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:36:22'),
(18, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:37:57'),
(19, 3, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=1', '2026-10-07 03:38:14'),
(20, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:38:26'),
(21, 2, 'APPROVE_PINJAM', 'peminjaman', 'Peminjaman id=1 disetujui', '2026-10-07 03:38:35'),
(22, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:38:57'),
(23, 3, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=2', '2026-10-07 03:39:24'),
(24, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:39:39'),
(25, 2, 'APPROVE_PINJAM', 'peminjaman', 'Peminjaman id=2 disetujui', '2026-10-07 03:39:47'),
(26, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:40:01'),
(27, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:40:43'),
(28, 3, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=3', '2026-10-07 03:41:12'),
(29, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:41:29'),
(30, 2, 'APPROVE_PINJAM', 'peminjaman', 'Peminjaman id=3 disetujui', '2026-10-07 03:41:37'),
(31, 2, 'KEMBALIKAN_ALAT', 'pengembalian', 'id_pinjam=3, denda=8000.00', '2026-10-07 03:45:34'),
(32, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:46:41'),
(33, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 03:46:59'),
(34, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:05:35'),
(35, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:06:16'),
(36, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:06:23'),
(37, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:18:11'),
(38, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:18:24'),
(39, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:18:58'),
(40, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:19:08'),
(41, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:19:20'),
(42, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:19:47'),
(43, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:22:26'),
(44, 1, 'TAMBAH_USER', 'user', 'Menambah user: Danang', '2026-10-07 04:24:56'),
(45, 1, 'TAMBAH_USER', 'user', 'Menambah user: Peminjam1', '2026-10-07 04:36:26'),
(46, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:38:46'),
(47, 1, 'TAMBAH_USER', 'user', 'Menambah user: Arly', '2026-10-07 04:40:21'),
(48, 8, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:40:41'),
(49, 8, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=4', '2026-10-07 04:40:56'),
(50, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:41:08'),
(51, 2, 'APPROVE_PINJAM', 'peminjaman', 'Peminjaman id=4 disetujui', '2026-10-07 04:41:18'),
(52, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:42:19'),
(53, 3, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=5', '2026-10-07 04:42:38'),
(54, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:49:20'),
(55, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:52:08'),
(56, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:52:23'),
(57, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:55:15'),
(58, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:56:11'),
(59, 3, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=6', '2026-10-07 04:56:26'),
(60, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:56:44'),
(61, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 04:57:12'),
(62, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:00:21'),
(63, 2, 'DENDA_LUNAS', 'pengembalian', 'Denda Rp8.000 ditandai LUNAS', '2026-10-06 22:00:31'),
(64, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:00:47'),
(65, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:02:19'),
(66, 4, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:02:35'),
(67, 4, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=7', '2026-10-07 05:03:04'),
(68, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:03:14'),
(69, 2, 'APPROVE_PINJAM', 'peminjaman', 'Peminjaman id=7 disetujui', '2026-10-07 05:03:23'),
(70, 2, 'KEMBALIKAN_ALAT', 'pengembalian', 'id_pinjam=7, denda=8000.00', '2026-10-07 05:03:35'),
(71, 4, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:03:49'),
(72, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:07:56'),
(73, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:10:13'),
(74, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 05:12:01'),
(75, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 06:12:00'),
(76, 3, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=8', '2026-10-07 06:12:43'),
(77, 3, 'AJUKAN_PINJAM', 'peminjaman', 'Pengajuan id_pinjam=9', '2026-10-07 06:13:05'),
(78, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 06:13:32'),
(79, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 06:21:45'),
(80, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 06:26:59'),
(81, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 06:38:59'),
(82, 3, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 06:39:27'),
(83, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-07 06:51:28'),
(84, 2, 'LOGIN', 'user', 'Login berhasil', '2026-10-08 00:29:48'),
(85, 1, 'LOGIN', 'user', 'Login berhasil', '2026-10-08 11:48:07');

-- --------------------------------------------------------

--
-- Struktur dari tabel `migrations`
--

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2026_10_07_013338_create_personal_access_tokens_table', 1);

-- --------------------------------------------------------

--
-- Struktur dari tabel `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `peminjaman`
--

DROP TABLE IF EXISTS `peminjaman`;
CREATE TABLE `peminjaman` (
  `id_pinjam` int(11) NOT NULL,
  `id_user` int(11) NOT NULL,
  `id_alat` int(11) NOT NULL,
  `tgl_pinjam` date NOT NULL,
  `tgl_rencana_kembali` date NOT NULL,
  `tgl_kembali_aktual` date DEFAULT NULL,
  `jumlah` int(11) NOT NULL DEFAULT 1,
  `status` enum('diajukan','disetujui','ditolak','dipinjam','dikembalikan') DEFAULT 'diajukan',
  `id_petugas` int(11) DEFAULT NULL,
  `catatan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `peminjaman`
--

INSERT INTO `peminjaman` (`id_pinjam`, `id_user`, `id_alat`, `tgl_pinjam`, `tgl_rencana_kembali`, `tgl_kembali_aktual`, `jumlah`, `status`, `id_petugas`, `catatan`) VALUES
(1, 3, 6, '2026-10-07', '2026-10-09', NULL, 1, 'disetujui', 2, NULL),
(2, 3, 5, '2026-10-07', '2026-10-08', NULL, 1, 'disetujui', 2, NULL),
(3, 3, 4, '2026-10-01', '2026-10-03', '2026-10-07', 1, 'dikembalikan', 2, NULL),
(4, 8, 8, '2026-10-07', '2026-10-08', NULL, 1, 'disetujui', 2, NULL),
(5, 3, 7, '2026-10-07', '2026-10-09', NULL, 1, 'ditolak', 2, NULL),
(6, 3, 8, '2026-10-07', '2026-10-08', NULL, 5, 'diajukan', NULL, NULL),
(7, 4, 6, '2026-10-01', '2026-10-03', '2026-10-07', 1, 'dikembalikan', 2, NULL),
(8, 3, 4, '2026-10-07', '2026-10-08', NULL, 4, 'diajukan', NULL, NULL),
(9, 3, 8, '2026-10-07', '2026-10-09', NULL, 4, 'diajukan', NULL, NULL);

--
-- Trigger `peminjaman`
--
DROP TRIGGER IF EXISTS `trg_peminjaman_approved`;
DELIMITER $$
CREATE TRIGGER `trg_peminjaman_approved` AFTER UPDATE ON `peminjaman` FOR EACH ROW BEGIN
    IF OLD.status <> NEW.status AND NEW.status = 'disetujui' THEN
        INSERT INTO log_aktivitas (id_user, aksi, tabel_terkait, deskripsi)
        VALUES (NEW.id_petugas, 'APPROVE_PINJAM', 'peminjaman',
                CONCAT('Peminjaman id=', NEW.id_pinjam, ' disetujui'));
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Struktur dari tabel `pengembalian`
--

DROP TABLE IF EXISTS `pengembalian`;
CREATE TABLE `pengembalian` (
  `id_kembali` int(11) NOT NULL,
  `id_pinjam` int(11) NOT NULL,
  `tgl_kembali` date NOT NULL,
  `kondisi_saat_kembali` enum('Baik','Rusak Ringan','Rusak Berat') DEFAULT 'Baik',
  `denda` decimal(10,2) DEFAULT 0.00,
  `denda_lunas` tinyint(1) DEFAULT 0,
  `tgl_lunas` timestamp NULL DEFAULT NULL,
  `id_petugas_lunas` int(11) DEFAULT NULL,
  `keterangan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `pengembalian`
--

INSERT INTO `pengembalian` (`id_kembali`, `id_pinjam`, `tgl_kembali`, `kondisi_saat_kembali`, `denda`, `denda_lunas`, `tgl_lunas`, `id_petugas_lunas`, `keterangan`) VALUES
(1, 3, '2026-10-07', 'Baik', 8000.00, 1, '2026-10-06 22:00:31', 2, NULL),
(2, 7, '2026-10-07', 'Baik', 8000.00, 0, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `personal_access_tokens`
--

INSERT INTO `personal_access_tokens` (`id`, `tokenable_type`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(1, 'App\\Models\\User', 1, 'auth_token', 'db86e7fe200e731d8a964538143c5b6e8def2ccbd5144ad60378c61b42eac382', '[\"*\"]', '2026-10-06 20:22:51', NULL, '2026-10-06 20:12:29', '2026-10-06 20:22:51'),
(2, 'App\\Models\\User', 1, 'auth_token', '52c95f42c96e218d01bd6833df4327c976b38cb582c4ef620bff4a1fe6cf7d2c', '[\"*\"]', NULL, NULL, '2026-10-06 20:22:00', '2026-10-06 20:22:00'),
(3, 'App\\Models\\User', 1, 'auth_token', '85d8dec5982c12f46bb6f33e0718b73c31847092f1607a4f6da49ef01dacd1c5', '[\"*\"]', '2026-10-06 20:31:39', NULL, '2026-10-06 20:23:27', '2026-10-06 20:31:39'),
(4, 'App\\Models\\User', 2, 'auth_token', '015bb3bbfa1fd439bb38a56b22306d3ec3d41cc1dc851e1a66af185c3f620890', '[\"*\"]', '2026-10-06 20:35:24', NULL, '2026-10-06 20:35:11', '2026-10-06 20:35:24'),
(5, 'App\\Models\\User', 3, 'auth_token', '92a81bd1a91eba6bd3389b2b81feb91ac8a348814b2e55b131fa03c9e3fe0908', '[\"*\"]', '2026-10-06 20:35:30', NULL, '2026-10-06 20:35:29', '2026-10-06 20:35:30'),
(6, 'App\\Models\\User', 2, 'auth_token', '00458d79a05d49828e4bfd4611874baed1f740937718338ac19e12708d00d2ab', '[\"*\"]', '2026-10-06 20:35:41', NULL, '2026-10-06 20:35:40', '2026-10-06 20:35:41'),
(7, 'App\\Models\\User', 1, 'auth_token', '6389724c317a32a62c10083e3204cd6a120fad3f3a117deeb487c957da5c5498', '[\"*\"]', '2026-10-06 20:37:45', NULL, '2026-10-06 20:36:22', '2026-10-06 20:37:45'),
(8, 'App\\Models\\User', 3, 'auth_token', 'cf42cbed7fb3b3a9e48c864f830f6f2980fb201414bfc0af96c002f851a14029', '[\"*\"]', '2026-10-06 20:38:19', NULL, '2026-10-06 20:37:57', '2026-10-06 20:38:19'),
(9, 'App\\Models\\User', 2, 'auth_token', '72d258b2c13726e55f8dc5e4f4f7027c2e98ab790e46c5c500076f490081afe8', '[\"*\"]', '2026-10-06 20:38:49', NULL, '2026-10-06 20:38:26', '2026-10-06 20:38:49'),
(10, 'App\\Models\\User', 3, 'auth_token', '6f31ad37e87e89fb295a32039a25c8e4b1e826b2189a50e3a9fc53c23aab07f9', '[\"*\"]', '2026-10-06 20:39:34', NULL, '2026-10-06 20:38:57', '2026-10-06 20:39:34'),
(11, 'App\\Models\\User', 2, 'auth_token', '898a80fb628d7659a37b92fad5796c339715a881dee37e6b18e3ee1372b01c16', '[\"*\"]', '2026-10-06 20:39:58', NULL, '2026-10-06 20:39:39', '2026-10-06 20:39:58'),
(12, 'App\\Models\\User', 1, 'auth_token', '25360bdc9e8803a593699c6a3468a907c965c9bfd4cd54153c1dc697124756be', '[\"*\"]', '2026-10-06 20:40:38', NULL, '2026-10-06 20:40:01', '2026-10-06 20:40:38'),
(13, 'App\\Models\\User', 3, 'auth_token', '5edad5eb2a8703b2daaa766e9e4e7c82a38f30222fc10c6b3d95de7c829234f9', '[\"*\"]', '2026-10-06 20:41:20', NULL, '2026-10-06 20:40:43', '2026-10-06 20:41:20'),
(14, 'App\\Models\\User', 2, 'auth_token', 'ebdbe6d64686f68898944d1b7ac57486359504de31c51f70bd63415679e52f25', '[\"*\"]', '2026-10-06 20:46:36', NULL, '2026-10-06 20:41:29', '2026-10-06 20:46:36'),
(15, 'App\\Models\\User', 3, 'auth_token', '82324c5e99310e02c70a765a0d2d6d8f74a8a6ebc40dd410b811de636b81a989', '[\"*\"]', '2026-10-06 20:46:54', NULL, '2026-10-06 20:46:41', '2026-10-06 20:46:54'),
(16, 'App\\Models\\User', 1, 'auth_token', 'f91fc346189895f2edb4eca2ebdb8d22562c023de9ded1fac2cabcacfe646a48', '[\"*\"]', '2026-10-06 21:05:30', NULL, '2026-10-06 20:46:59', '2026-10-06 21:05:30'),
(17, 'App\\Models\\User', 3, 'auth_token', '7198308a26a5650d99fea6745610c4719eb7906915bfdde62aae905f6916b885', '[\"*\"]', '2026-10-06 21:06:14', NULL, '2026-10-06 21:05:35', '2026-10-06 21:06:14'),
(18, 'App\\Models\\User', 1, 'auth_token', '703b12bc7371e865f568c9ab064715da5249efc72e8ada9750361151e445d1d3', '[\"*\"]', '2026-10-06 21:06:18', NULL, '2026-10-06 21:06:16', '2026-10-06 21:06:18'),
(19, 'App\\Models\\User', 2, 'auth_token', '8ca279ec41305f190acadfdff279ec6a87378824226318fb285b0c1d859da55a', '[\"*\"]', '2026-10-06 21:18:06', NULL, '2026-10-06 21:06:23', '2026-10-06 21:18:06'),
(20, 'App\\Models\\User', 3, 'auth_token', 'b8593a01357019bfe349b37729d428bfe6c347cccb39846e4dd54edfd947523e', '[\"*\"]', '2026-10-06 21:18:18', NULL, '2026-10-06 21:18:11', '2026-10-06 21:18:18'),
(21, 'App\\Models\\User', 1, 'auth_token', 'aee3320332f05b6cf165a1fccf0ae581b13f6b7cf37244a69b1455e80e23e237', '[\"*\"]', '2026-10-06 21:18:25', NULL, '2026-10-06 21:18:24', '2026-10-06 21:18:25'),
(22, 'App\\Models\\User', 1, 'auth_token', 'f19752ef81277ed6eb481f674fd7ce20dcc087866dfc95874a04d1ccd7a80790', '[\"*\"]', '2026-10-06 21:19:00', NULL, '2026-10-06 21:18:58', '2026-10-06 21:19:00'),
(23, 'App\\Models\\User', 3, 'auth_token', 'abbca9644d19f909f707d2b2026a9bc941f6b614daab6e7f256d32eabdddff5e', '[\"*\"]', '2026-10-06 21:19:11', NULL, '2026-10-06 21:19:08', '2026-10-06 21:19:11'),
(24, 'App\\Models\\User', 2, 'auth_token', '107c044fdd2d0c1c0db4f380351f8403eeb015fb7e3ec365777367de16d4fc4d', '[\"*\"]', '2026-10-06 21:19:21', NULL, '2026-10-06 21:19:20', '2026-10-06 21:19:21'),
(25, 'App\\Models\\User', 1, 'auth_token', '23c4587bc51f4725839e4bfff713c24afb3382b6a615fc006129bbd3f4e09900', '[\"*\"]', '2026-10-06 21:20:21', NULL, '2026-10-06 21:19:47', '2026-10-06 21:20:21'),
(26, 'App\\Models\\User', 1, 'auth_token', 'df3982a9620cab3c84753e43d4fdd8c70e3eb43d4f43ef0646dc54f11b04f0c5', '[\"*\"]', '2026-10-06 21:38:32', NULL, '2026-10-06 21:22:26', '2026-10-06 21:38:32'),
(27, 'App\\Models\\User', 1, 'auth_token', 'eb020fe02b26750a83a673a83d3e15a9ab7c4afc594ba514cc1828d6dc0658fd', '[\"*\"]', '2026-10-06 21:40:21', NULL, '2026-10-06 21:38:46', '2026-10-06 21:40:21'),
(28, 'App\\Models\\User', 8, 'auth_token', '8c06929f6c89a970e2754f1e908dfc484181127ace50fabfb5bdcc8fe8804be0', '[\"*\"]', '2026-10-06 21:40:57', NULL, '2026-10-06 21:40:40', '2026-10-06 21:40:57'),
(29, 'App\\Models\\User', 2, 'auth_token', '2986f97e856bebc0c9ba54270edf5e018d950aead9b4d8fa9c08f6abfae1f965', '[\"*\"]', '2026-10-06 21:42:10', NULL, '2026-10-06 21:41:08', '2026-10-06 21:42:10'),
(30, 'App\\Models\\User', 3, 'auth_token', 'ef45a21375a2f82ab106279f20b5b144d0b5bfdd808793f82beff70d83254873', '[\"*\"]', '2026-10-06 21:42:39', NULL, '2026-10-06 21:42:19', '2026-10-06 21:42:39'),
(31, 'App\\Models\\User', 1, 'auth_token', 'f9e7e75588574f0ea0dee25444e71f2aaedc19a3609d9b71e77fd3e45ad923db', '[\"*\"]', '2026-10-06 21:51:56', NULL, '2026-10-06 21:49:20', '2026-10-06 21:51:56'),
(32, 'App\\Models\\User', 3, 'auth_token', '016b1712ba003f80791495cec2be79e1535719255d234754227dcf8057e35c8a', '[\"*\"]', '2026-10-06 21:52:09', NULL, '2026-10-06 21:52:08', '2026-10-06 21:52:09'),
(33, 'App\\Models\\User', 2, 'auth_token', '40d164b7718359f2ac938ea0876b18993bd24e65dd2c1dd9029ee06d73386f65', '[\"*\"]', '2026-10-06 21:52:26', NULL, '2026-10-06 21:52:23', '2026-10-06 21:52:26'),
(34, 'App\\Models\\User', 1, 'auth_token', 'c2e3ff6968df3bbfef7108d37632be6277d551395b6bca8e587fa43201a3ff4f', '[\"*\"]', '2026-10-06 21:56:05', NULL, '2026-10-06 21:55:15', '2026-10-06 21:56:05'),
(35, 'App\\Models\\User', 3, 'auth_token', '4b02b73279d392461a637d4c82516dfa2be697e4844fa873f5364bd1e57823bf', '[\"*\"]', '2026-10-06 21:56:32', NULL, '2026-10-06 21:56:11', '2026-10-06 21:56:32'),
(36, 'App\\Models\\User', 2, 'auth_token', 'f5308a79503dee613b59b74c364a9c4a05c653b5dd613a11c76c937b8dd6b895', '[\"*\"]', '2026-10-06 21:57:04', NULL, '2026-10-06 21:56:44', '2026-10-06 21:57:04'),
(37, 'App\\Models\\User', 3, 'auth_token', '58d02fd662cf529319ed9d6e7b93ee7fa4634433526bebed4399e0159b1b778a', '[\"*\"]', '2026-10-06 21:57:37', NULL, '2026-10-06 21:57:12', '2026-10-06 21:57:37'),
(38, 'App\\Models\\User', 2, 'auth_token', 'c2408e9f9e61b16ef2ccab57d1b96389c0a0588298386866c70dcb9a16fe5895', '[\"*\"]', '2026-10-06 22:00:36', NULL, '2026-10-06 22:00:21', '2026-10-06 22:00:36'),
(39, 'App\\Models\\User', 3, 'auth_token', '43dce14b10f2ab17037445a42a97b2724a6068554bf637ddbc5a12ba44a2e87d', '[\"*\"]', '2026-10-06 22:00:54', NULL, '2026-10-06 22:00:47', '2026-10-06 22:00:54'),
(40, 'App\\Models\\User', 1, 'auth_token', 'fe32ba97cd3d6589365319f2ab95cea580e4e702a4f386f3989495307219a386', '[\"*\"]', '2026-10-06 22:02:23', NULL, '2026-10-06 22:02:19', '2026-10-06 22:02:23'),
(41, 'App\\Models\\User', 4, 'auth_token', 'fa58b8b0de3389adda8187470fe24fefe18f7e54d7b2e77809e37fb71ad9a771', '[\"*\"]', '2026-10-06 22:03:05', NULL, '2026-10-06 22:02:35', '2026-10-06 22:03:05'),
(42, 'App\\Models\\User', 2, 'auth_token', 'ec964aa17cd8216ea7118a1216f1296f9ad4f4c585e4f389ee41da2b857fef61', '[\"*\"]', '2026-10-06 22:03:36', NULL, '2026-10-06 22:03:14', '2026-10-06 22:03:36'),
(43, 'App\\Models\\User', 4, 'auth_token', '6fe0b56610822f5e3d18beaa83e8399a5c4bcc1759f6a8260483a707131c82af', '[\"*\"]', '2026-10-06 22:03:52', NULL, '2026-10-06 22:03:49', '2026-10-06 22:03:52'),
(44, 'App\\Models\\User', 1, 'auth_token', 'b85441561e0cbf248f016565ad0877a03f2c10853fb488a4e8768ea347f89542', '[\"*\"]', '2026-10-06 22:07:59', NULL, '2026-10-06 22:07:56', '2026-10-06 22:07:59'),
(45, 'App\\Models\\User', 2, 'auth_token', 'ff66e6e34375ac689c73a4773de2cf81a8ff460ee0602f60505be342f2431968', '[\"*\"]', '2026-10-06 22:10:16', NULL, '2026-10-06 22:10:13', '2026-10-06 22:10:16'),
(46, 'App\\Models\\User', 1, 'auth_token', 'a80510696b45b56cfd12e87ed0b63f6044f2452ae527ff520700486e34ab9964', '[\"*\"]', '2026-10-06 23:03:24', NULL, '2026-10-06 22:12:01', '2026-10-06 23:03:24'),
(47, 'App\\Models\\User', 3, 'auth_token', '945477405b47d1bba5960025042928fabddb9503998174967fd4213dab0d35d0', '[\"*\"]', '2026-10-06 23:13:06', NULL, '2026-10-06 23:12:00', '2026-10-06 23:13:06'),
(48, 'App\\Models\\User', 2, 'auth_token', 'bb82ce622a69905e14765ab49b0cb5987109cce2e83425841bf0c8737c70cfb9', '[\"*\"]', '2026-10-06 23:19:24', NULL, '2026-10-06 23:13:32', '2026-10-06 23:19:24'),
(49, 'App\\Models\\User', 3, 'auth_token', 'f0aa635404335e99d8ebc0a4fa29dd66d45de27e9b9fd34a7029a3b41986fd4d', '[\"*\"]', '2026-10-06 23:26:43', NULL, '2026-10-06 23:21:45', '2026-10-06 23:26:43'),
(50, 'App\\Models\\User', 2, 'auth_token', '8cfa480473739159d6d8077d884c324513f313d65c9819bd5bd22fe5bf5baed7', '[\"*\"]', '2026-10-06 23:38:54', NULL, '2026-10-06 23:26:59', '2026-10-06 23:38:54'),
(51, 'App\\Models\\User', 1, 'auth_token', '18180b7b1454f17d626b9d68f5b9a7f005787eb6266f52b46424c307d9482709', '[\"*\"]', '2026-10-06 23:39:17', NULL, '2026-10-06 23:38:59', '2026-10-06 23:39:17'),
(52, 'App\\Models\\User', 3, 'auth_token', '47148bd17f9293050173b1e97eab7e420f0b996e699cbfe0167655b6c4fdad03', '[\"*\"]', '2026-10-06 23:51:18', NULL, '2026-10-06 23:39:27', '2026-10-06 23:51:18'),
(53, 'App\\Models\\User', 2, 'auth_token', 'd42e519516079a6d550a3b13adee4eede54b7954ad0be027da59994924409387', '[\"*\"]', '2026-10-07 17:29:41', NULL, '2026-10-06 23:51:28', '2026-10-07 17:29:41'),
(54, 'App\\Models\\User', 2, 'auth_token', '576e563159b8d2df783d05fd8307ef9bf547b839f97e92f9b6d1bf06594b32b8', '[\"*\"]', '2026-10-08 04:47:52', NULL, '2026-10-07 17:29:48', '2026-10-08 04:47:52'),
(55, 'App\\Models\\User', 1, 'auth_token', '2a04f89de49c1db7378094e7f659196778522645dfb20b0b5c7a5c96986a97c3', '[\"*\"]', '2026-10-08 04:48:10', NULL, '2026-10-08 04:48:07', '2026-10-08 04:48:10');

-- --------------------------------------------------------

--
-- Struktur dari tabel `sessions`
--

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `user`
--

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id_user` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `role` enum('admin','petugas','peminjam') NOT NULL,
  `no_telp` varchar(15) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `user`
--

INSERT INTO `user` (`id_user`, `username`, `password`, `nama_lengkap`, `role`, `no_telp`, `is_active`, `created_at`) VALUES
(1, 'admin', '0192023a7bbd73250516f069df18b500', 'Andi Administrator', 'admin', '0811111111', 1, '2026-10-07 01:39:47'),
(2, 'petugas', '570c396b3fc856eceb8aa7357f32af1a', 'Budi Petugas', 'petugas', '0822222222', 1, '2026-10-07 01:39:47'),
(3, 'peminjam', '6ad14ba9986e3615423dfca256d04e3f', 'Candra Peminjam', 'peminjam', '0833333333', 1, '2026-10-07 01:39:47'),
(4, 'Dewi', '6ad14ba9986e3615423dfca256d04e3f', 'Dewi Latifatul', 'peminjam', '0897655432', 1, '2026-10-07 04:20:21'),
(8, 'Arly', '6ad14ba9986e3615423dfca256d04e3f', 'Arly Yulia aaaaaaaa', 'peminjam', '098765432', 1, '2026-10-07 04:40:21');

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `alat`
--
ALTER TABLE `alat`
  ADD PRIMARY KEY (`id_alat`),
  ADD UNIQUE KEY `kode_alat` (`kode_alat`),
  ADD KEY `id_kategori` (`id_kategori`);

--
-- Indeks untuk tabel `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_expiration_index` (`expiration`);

--
-- Indeks untuk tabel `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_locks_expiration_index` (`expiration`);

--
-- Indeks untuk tabel `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indeks untuk tabel `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indeks untuk tabel `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `kategori`
--
ALTER TABLE `kategori`
  ADD PRIMARY KEY (`id_kategori`),
  ADD UNIQUE KEY `nama_kategori` (`nama_kategori`);

--
-- Indeks untuk tabel `log_aktivitas`
--
ALTER TABLE `log_aktivitas`
  ADD PRIMARY KEY (`id_log`),
  ADD KEY `id_user` (`id_user`);

--
-- Indeks untuk tabel `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indeks untuk tabel `peminjaman`
--
ALTER TABLE `peminjaman`
  ADD PRIMARY KEY (`id_pinjam`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_alat` (`id_alat`),
  ADD KEY `id_petugas` (`id_petugas`);

--
-- Indeks untuk tabel `pengembalian`
--
ALTER TABLE `pengembalian`
  ADD PRIMARY KEY (`id_kembali`),
  ADD UNIQUE KEY `id_pinjam` (`id_pinjam`);

--
-- Indeks untuk tabel `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  ADD KEY `personal_access_tokens_expires_at_index` (`expires_at`);

--
-- Indeks untuk tabel `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indeks untuk tabel `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id_user`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `alat`
--
ALTER TABLE `alat`
  MODIFY `id_alat` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `kategori`
--
ALTER TABLE `kategori`
  MODIFY `id_kategori` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `log_aktivitas`
--
ALTER TABLE `log_aktivitas`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=86;

--
-- AUTO_INCREMENT untuk tabel `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `peminjaman`
--
ALTER TABLE `peminjaman`
  MODIFY `id_pinjam` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT untuk tabel `pengembalian`
--
ALTER TABLE `pengembalian`
  MODIFY `id_kembali` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT untuk tabel `user`
--
ALTER TABLE `user`
  MODIFY `id_user` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `alat`
--
ALTER TABLE `alat`
  ADD CONSTRAINT `alat_ibfk_1` FOREIGN KEY (`id_kategori`) REFERENCES `kategori` (`id_kategori`) ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `log_aktivitas`
--
ALTER TABLE `log_aktivitas`
  ADD CONSTRAINT `log_aktivitas_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `peminjaman`
--
ALTER TABLE `peminjaman`
  ADD CONSTRAINT `peminjaman_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON UPDATE CASCADE,
  ADD CONSTRAINT `peminjaman_ibfk_2` FOREIGN KEY (`id_alat`) REFERENCES `alat` (`id_alat`) ON UPDATE CASCADE,
  ADD CONSTRAINT `peminjaman_ibfk_3` FOREIGN KEY (`id_petugas`) REFERENCES `user` (`id_user`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `pengembalian`
--
ALTER TABLE `pengembalian`
  ADD CONSTRAINT `pengembalian_ibfk_1` FOREIGN KEY (`id_pinjam`) REFERENCES `peminjaman` (`id_pinjam`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
