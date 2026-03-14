DROP DATABASE IF EXISTS rocktime;
CREATE DATABASE rocktime;
USE rocktime;

DROP TABLE IF EXISTS users;
CREATE TABLE users(
   usrID int primary key auto_increment,
   usrName varchar(50),
   usrPassword varchar(256),
   usrFullName varchar(50),
   usrEmail varchar(100),
   usrPhone varchar(15),
   usrStatus tinyint default 1
) ENGINE = InnoDB;
INSERT INTO users (usrName, usrPassword, usrFullName, usrEmail, usrPhone, usrStatus) 
VALUES ('3ufran', '$argon2id$v=19$m=65536,t=4,p=1$UTR8x+j3ZIjqx9oFyjV1dg$/hEv5DhkkYGw/xpYl5moRIHFL1dQEABwxUuYeDeOjl4', 'Ghufran Ataie', 'gataie@myseneca.ca', '6478219911', 1);

create table shows(
   shwID int primary key auto_increment,
   shwTitle varchar(150),
   shwArtist varchar(50),
   shwCategory enum('Concerts', 'Theater', 'Comedy', 'Festivals', 'Sports', 'Workshops'),
   shwDate date,
   shwTime time,
   shwLocation varchar(100),
   shwCity varchar(30),
   shwImage varchar(250),
   shwDetails text
) ENGINE = InnoDB;

INSERT INTo shows (shwTitle, shwArtist, shwCategory, shwDate, shwTime, shwLocation, shwCity, shwImage, shwDetails)
VALUES
('Neon Horizon World Tour', 'Aurora Blake', 'Concerts', '2026-03-15', '20:00', 'Madison Square Garden', 'New York', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/nwtab.jpg', 'Experience the electrifying Neon Horizon World Tour with Aurora Blake. A night of pulsating beats, mesmerizing visuals, and unforgettable music.'),
('The Phantoms Return', 'West End Revival', 'Theater', '2026-03-22', '19:30', 'Royal Theater', 'London', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/thePhantoms.jpg', 'A stunning revival of the classic phantom tale, brought to life with breathtaking sets, costumes, and performances by the West End Revival company.'),
('Laugh Until Dawn', 'Dave Morales', 'Comedy', '2026-04-05', '21:00', 'The Comedy Store', 'Los Angeles', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/loughUntilDown.jpg', 'Get ready for a night of non-stop laughter with the legendary Dave Morales, known for his sharp wit and hilarious storytelling.'),
('Synthwave Dreams Festival', 'Various Artists', 'Concerts', '2026-04-12', '18:00', 'Coachella Valley', 'Toronto', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/dreamsFestival.jpg', 'An immersive two-day synthwave festival featuring the best electronic artists from around the world. Prepare for stunning light shows and incredible beats.'),
('Shakespeare Under Stars', 'Globe Players', 'Theater', '2026-04-20', '20:30', 'Central Park Amphitheater', 'New York', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/', 'A magical evening of Shakespeare performed under the open sky. The Globe Players bring timeless stories to life in an intimate outdoor setting.'),
('Midnight Jazz Sessions', 'The Blue Note Collective', 'Concerts', '2026-05-01', '22:00', 'Blue Note Jazz Club', 'Chicago', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/underStars.jpg', 'Lose yourself in the smooth, soulful sounds of The Blue Note Collective. An intimate jazz experience that will transport you to another era.'),
('Stand Up Showdown', 'Mixed Lineup', 'Comedy', '2026-05-10', '20:00', 'Gotham Comedy Club', 'New York', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/standUpShow.jpg', 'Five of the hottest comedians battle it out for the title of funniest in town. You decide who wins!'),
('Electronic Pulse', 'DJ Nexus', 'Concerts', '2026-05-18', '23:00', 'Warehouse 42', 'Berlin', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/standUpDown.jpg', 'Berlins underground scene comes alive with DJ Nexus at the iconic Warehouse 42. A night of deep house and techno that will keep you dancing until sunrise.');

create table showTickets(
   shtID int primary key auto_increment,
   shtShowID int,
   shtTotalTickets smallint,
   shtPrice decimal(17,4)
 ) ENGINE = InnoDB;
 INSERT INTO showTickets 
 (shtShowID, shtTotalTickets, shtPrice) 
 VALUES 
 (1, 120, '95'),
 (2, 140, '80'),
 (3, 60, '150'),
 (4, 90, '300'),
 (5, 200, '110'),
 (6, 70, '230'),
 (7, 180, '75'),
 (8, 220, '45');
 
create table bookings(
   bokID int primary key auto_increment,
   bokTicket int,
   bokSeatNumber tinyint,
   bokIndividual int,
   bokStatus enum('Reserved', 'Booked', 'Cancel'),
   bokPayMethod varchar(20),
   bokPayRef varchar(100),
   bokEntryTime timestamp
) ENGINE = InnoDB;
INSERT INTo bookings (bokTicket, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime) 
VALUES (1, 21, 1, 'Booked', 'Card', '123456789', curdate()), (2, 8, 1, 'Booked', 'PayPal', '987654321', curdate());

create table founders(
   id tinyint primary key auto_increment,
   firstName varchar(30),
   lastName varchar(30),
   founderRole varchar(100),
   avatar varchar(500)
) Engine InnoDB;

insert into founders (firstName, LastName, founderRole, avatar) values 
('Ghufran', 'Ataie', 'Backend Database Developer', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/ghufran.jpg'),
('Azamat', '', 'Front End Developer', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/azamat.jpg'),
('Karson', '', 'System Administrator', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/karson.jpg'),
('Mehdi', '', 'Instructor', 'https://rocktime-assets.s3.us-east-1.amazonaws.com/mehdi.jpg');

ALTER TABLE showTickets ADD FOREIGN KEY (shtShowID) REFERENCES shows (shwID);
ALTER TABLE bookings ADD FOREIGN KEY (bokTicket) REFERENCES showTickets (shtID);
ALTER TABLE bookings ADD FOREIGN KEY (bokIndividual) REFERENCES users (usrID);