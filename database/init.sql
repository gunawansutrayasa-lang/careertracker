-- =========================================================================
-- UAS DATABASE: CAREERTRACKER INITIALIZATION SCRIPT
-- =========================================================================

-- 1. CREATE DATABASE
CREATE DATABASE IF NOT EXISTS careertracker;
USE careertracker;

-- =========================================================================
-- TABEL 1: USERS (Entitas Utama)
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- INDEX UNTUK USERS (Syarat Ujian: Unique Index)
CREATE UNIQUE INDEX idx_user_email ON users(email);


-- =========================================================================
-- TABEL 2: EXPERIENCES (Pengalaman Kerja)
-- =========================================================================
CREATE TABLE IF NOT EXISTS experiences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NULL, -- NULL berarti masih bekerja di sini
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- INDEX UNTUK EXPERIENCES (Syarat Ujian: Single Index untuk optimasi filter/sorting)
CREATE INDEX idx_exp_company ON experiences(company_name);


-- =========================================================================
-- TABEL 3: PROJECTS (Projek yang Pernah Dibuat)
-- =========================================================================
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    project_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Contoh: Web, Mobile, IoT (Untuk bahan Filter)
    status VARCHAR(20) NOT NULL,   -- Contoh: Ongoing, Completed (Untuk bahan Filter)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,        -- Untuk bahan query BETWEEN
    project_url VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- INDEX UNTUK PROJECTS (Syarat Ujian: Composite Index untuk Search + Filter yang cepat)
CREATE INDEX idx_project_name_status ON projects(project_name, status);


-- =========================================================================
-- TABEL 4: ORGANIZATIONS (Pengalaman Organisasi)
-- =========================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_name VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =========================================================================
-- TABEL 5: ACHIEVEMENTS (Prestasi)
-- =========================================================================
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    issuer VARCHAR(100) NOT NULL,
    date_awarded DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =========================================================================
-- TABEL 6: CERTIFICATES (Sertifikasi Profesional)
-- =========================================================================
CREATE TABLE IF NOT EXISTS certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    certificate_name VARCHAR(100) NOT NULL,
    credential_id VARCHAR(100),
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =========================================================================
-- TABEL 7: SKILLS (Keahlian)
-- =========================================================================
CREATE TABLE IF NOT EXISTS skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    skill_name VARCHAR(50) NOT NULL,
    level VARCHAR(20) NOT NULL, -- Contoh: Beginner, Intermediate, Expert
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- =========================================================================
-- DATA AWAL (SEEDER SQL) - Agar saat pertama kali running database langsung terisi data tes
-- =========================================================================

-- Insert User Dummy (Password sengaja plain text/simple dulu untuk test login awal)
INSERT INTO users (id, username, email, password) VALUES 
(1, 'mahasiswakeren', 'mhs@test.com', 'password123');

-- Insert Projects Dummy (Memenuhi prasyarat INNER JOIN nanti)
INSERT INTO projects (user_id, project_name, category, status, start_date, end_date, description) VALUES 
(1, 'E-Commerce App', 'Web', 'Completed', '2026-01-01', '2026-03-01', 'Membangun web toko online dengan Node.js'),
(1, 'Smart Agriculture IoT', 'IoT', 'Ongoing', '2026-04-15', '2026-07-20', 'Sistem monitoring tanaman otomatis'),
(1, 'Mobile Attendance', 'Mobile', 'Completed', '2025-10-01', '2025-12-25', 'Aplikasi absensi berbasis geo-fencing');

-- Insert Experiences Dummy
INSERT INTO experiences (user_id, company_name, role, location, start_date, end_date, description) VALUES
(1, 'Google Indonesia', 'Software Engineer Intern', 'Jakarta', '2026-01-01', '2026-04-01', 'Membantu optimasi query database.');

-- Insert Organizations Dummy
INSERT INTO organizations (user_id, organization_name, role, start_date, end_date, description) VALUES
(1, 'Himpunan Mahasiswa Informatika', 'Kepala Divisi R&D', '2025-01-01', '2025-12-31', 'Mengkoordinasi pelatihan coding.');

-- Insert Achievements Dummy
INSERT INTO achievements (user_id, achievement_name, issuer, date_awarded, description) VALUES
(1, 'Juara 1 Hackathon Nasional', 'Kemenristek', '2026-03-20', 'Membuat solusi aplikasi finansial.');

-- Insert Certificates Dummy
INSERT INTO certificates (user_id, certificate_name, credential_id, valid_until) VALUES
(1, 'AWS Certified Cloud Practitioner', 'AWS-990123', '2029-12-31');

-- Insert Skills Dummy
INSERT INTO skills (user_id, skill_name, level) VALUES
(1, 'JavaScript', 'Expert'),
(1, 'MySQL', 'Intermediate'),
(1, 'Docker', 'Intermediate');