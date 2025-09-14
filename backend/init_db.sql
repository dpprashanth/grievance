CREATE DATABASE IF NOT EXISTS grievance_db;
USE grievance_db;

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    hierarchy ENUM('L1', 'L2', 'L3') NOT NULL,
    username VARCHAR(20) NOT NULL,
    password VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS grievances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    status ENUM('submitted', 'acknowledged', 'escalated') DEFAULT 'submitted',
    submitter_id INT,
    acknowledged_by INT,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (submitter_id) REFERENCES employees(id),
    FOREIGN KEY (acknowledged_by) REFERENCES employees(id)
);

INSERT INTO employees (name, hierarchy, username, password) VALUES
('Alice', 'L1', 'emp1', 'defaultpassword'),
('Bob', 'L1', 'emp2', 'defaultpassword'),
('Carol', 'L2', 'emp3', 'defaultpassword'),
('Dave', 'L2', 'emp4', 'defaultpassword'),
('Eve', 'L3', 'emp5', 'defaultpassword'),
('Frank', 'L3', 'emp6', 'defaultpassword');

-- Optionally, insert sample grievances
INSERT INTO grievances (description, status, submitter_id, created_at) VALUES
('Sample grievance 1', 'submitted', 1, '2025-09-10T10:00:00.000'), -- older than 2 days
('Sample grievance 2', 'submitted', 2, '2025-09-10T11:00:00.000'), -- older than 2 days
('Sample grievance 3', 'submitted', 1, DATE_FORMAT(NOW(3), '%Y-%m-%dT%H:%i:%s.%f')),
('Sample grievance 4', 'submitted', 2, DATE_FORMAT(NOW(3), '%Y-%m-%dT%H:%i:%s.%f')),
('Sample grievance 5', 'submitted', 1, DATE_FORMAT(NOW(3), '%Y-%m-%dT%H:%i:%s.%f')),
('Sample grievance 6', 'submitted', 2, DATE_FORMAT(NOW(3), '%Y-%m-%dT%H:%i:%s.%f')),
('Sample grievance 7', 'submitted', 1, DATE_FORMAT(NOW(3), '%Y-%m-%dT%H:%i:%s.%f')),
('Sample grievance 8', 'submitted', 2, DATE_FORMAT(NOW(3), '%Y-%m-%dT%H:%i:%s.%f')),
('Sample grievance 9', 'submitted', 1, DATE_FORMAT(NOW(3), '%Y-%m-%dT%H:%i:%s.%f')),
('Sample grievance 10', 'submitted', 2, DATE_FORMAT(NOW(3), '%Y-%m-%dT%H:%i:%s.%f'));