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

create table organizers(
   orgID smallint primary key auto_increment,
   orgCompanyName varchar(50),
   orgContactPerson int,
   orgPhone varchar(15),
   orgEmail varchar(100),
   orgWebsite varchar(150),
   orgAddress text,
   orgCity varchar(30),
   orgProvince varchar(30),
   orgCountry varchar(30),
   orgStatus tinyint default 0
) ENGINE = InnoDB;

INSERT INTO organizers (orgCompanyName, orgContactPerson, orgPhone, orgEmail, orgWebsite, orgAddress, orgCity, orgProvince, orgCountry, orgStatus) VALUES
('Netflix', 1, '6478219911', 'info@netflix.com', 'https://www.neftlix.com', 'Union Square', 'Toronto', 'ON', 'Canada', 1),
('Hollywood', 1, '6478459911', 'info@hollywood.com', 'https://www.hollywood.com', 'Time Square', 'New York', 'NY', 'United States', 1);

create table shows(
   shwID int primary key auto_increment,
   shwTitle varchar(150),
   shwArtist varchar(50),
   shwOrganizer smallint,
   shwCategory enum('Concerts', 'Theater', 'Comedy', 'Festivals', 'Sports', 'Workshops'),
   shwDate date,
   shwTime time,
   shwLocation varchar(100),
   shwCity varchar(30),
   shwImage varchar(250),
   shwDetails text,
) ENGINE = InnoDB;

INSERT INTo shows (shwTitle, shwArtist, shwOrganizer, shwCategory, shwDate, shwTime, shwLocation, shwCity, shwImage, shwDetails)
VALUES
('Neon Horizon World Tour', 'Aurora Blake', 1, 'Concerts', '2026-03-15', '20:00', 'Madison Square Garden', 'New York', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop', 'Experience the electrifying Neon Horizon World Tour with Aurora Blake. A night of pulsating beats, mesmerizing visuals, and unforgettable music.'),
('The Phantoms Return', 'West End Revival', 2, 'Theater', '2026-03-22', '19:30', 'Royal Theater', 'London', 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=600&h=400&fit=crop', 'A stunning revival of the classic phantom tale, brought to life with breathtaking sets, costumes, and performances by the West End Revival company.'),
('Laugh Until Dawn', 'Dave Morales', 2, 'Comedy', '2026-04-05', '21:00', 'The Comedy Store', 'Los Angeles', 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=600&h=400&fit=crop', 'Get ready for a night of non-stop laughter with the legendary Dave Morales, known for his sharp wit and hilarious storytelling.'),
('Synthwave Dreams Festival', 'Various Artists', 1, 'Concerts', '2026-04-12', '18:00', 'Coachella Valley', 'Indio', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop', 'An immersive two-day synthwave festival featuring the best electronic artists from around the world. Prepare for stunning light shows and incredible beats.'),
('Shakespeare Under Stars', 'Globe Players', 1, 'Theater', '2026-04-20', '20:30', 'Central Park Amphitheater', 'New York', 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&h=400&fit=crop', 'A magical evening of Shakespeare performed under the open sky. The Globe Players bring timeless stories to life in an intimate outdoor setting.'),
('Midnight Jazz Sessions', 'The Blue Note Collective', 1, 'Concerts', '2026-05-01', '22:00', 'Blue Note Jazz Club', 'Chicago', 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop', 'Lose yourself in the smooth, soulful sounds of The Blue Note Collective. An intimate jazz experience that will transport you to another era.'),
('Stand Up Showdown', 'Mixed Lineup', 2, 'Comedy', '2026-05-10', '20:00', 'Gotham Comedy Club', 'New York', 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=600&h=400&fit=crop', 'Five of the hottest comedians battle it out for the title of funniest in town. You decide who wins!'),
('Electronic Pulse', 'DJ Nexus', 2, 'Concerts', '2026-05-18', '23:00', 'Warehouse 42', 'Berlin', 'https://images.unsplash.com/photo-1571266028243-d220d14bfdd3?w=600&h=400&fit=crop', 'Berlins underground scene comes alive with DJ Nexus at the iconic Warehouse 42. A night of deep house and techno that will keep you dancing until sunrise.');

create table showTickets(
   shtID int primary key auto_increment,
   shtShowID int,
   shtType enum('Regular', 'VIP'),
   shtTotalTickets smallint,
   shtPrice decimal(17,4)
 ) ENGINE = InnoDB;
 INSERT INTO showTickets (shtShowID, shtType, shtTotalTickets, shtPrice) 
 VALUES (1, 'Regular', 120, '95'),
 (2, 'VIP', 20, '160'), (2, 'Regular', 140, '80'),
 (3, 'Regular', 60, '150'),
 (4, 'Regular', 90, '300'),
 (5, 'Regular', 200, '110'),
 (6, 'Regular', 70, '230'),
 (7, 'Regular', 180, '75'),
 (8, 'Regular', 220, '45');
 
 
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
('Ghufran', 'Ataie', 'Backend Database Developer', ''),
('Azamat', '', 'Front End Developer', ''),
('Karson', '', 'System Administrator', ''),
('Mehdi', '', 'Instructor', '');

ALTER TABLE organizers ADD FOREIGN KEY (orgContactPerson) REFERENCES users (usrID);
ALTER TABLE shows ADD FOREIGN KEY (shwOrganizer) REFERENCES organizers (orgID);
ALTER TABLE showTickets ADD FOREIGN KEY (shtShowID) REFERENCES shows (shwID);
ALTER TABLE bookings ADD FOREIGN KEY (bokTicket) REFERENCES showTickets (shtID);
ALTER TABLE bookings ADD FOREIGN KEY (bokIndividual) REFERENCES users (usrID);