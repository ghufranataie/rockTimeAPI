DROP DATABASE IF EXISTS rocktime;
CREATE DATABASE rocktime;
USE rocktime;

create table users(
   usrID int primary key,
   usrName varchar(50),
   usrPassword varchar(256),
   usrEmail varchar(100),
   usrPhone varchar(15),
   usrIndividual int,
   usrStatus tinyint
) ENGINE = InnoDB;

create table individuals(
   indID int primary key auto_increment,
   indName varchar(20),
   indLastName varchar(20),
   indPhone varchar(15),
   indEmail varchar(100),
   indPhoto varchar(150)
) ENGINE = InnoDB;

create table organizers(
   orgID smallint primary key auto_increment,
   orgCompany varchar(50),
   orgContactPerson int,
   orgPhone varchar(15),
   orgEmail varchar(100),
   orgWebsite varchar(150),
   orgAddress text,
   orgCity varchar(30),
   orgProvince varchar(30),
   orgCountry varchar(30),
   orgStatus tinyint
) ENGINE = InnoDB;

create table shows(
   shwID int primary key auto_increment,
   shwName varchar(150),
   shwOrganizer smallint,
   shwLocation varchar(100),
   shwDateTime datetime,
   shwDetails varchar(250)
) ENGINE = InnoDB;

create table showTickets(
   shtID int primary key auto_increment,
   shtShow int,
   shtType enum('General', 'Regular', 'VIP'),
   shtTotalTickets smallint,
   shtPrice decimal(17,4)
 ) ENGINE = InnoDB;
 
create table bookings(
   bokID int primary key auto_increment,
   bokTicket int,
   bokIndividual int,
   bokStatus enum('Reserved', 'Booked', 'Cancel'),
   bokEntryTime timestamp
) ENGINE = InnoDB;

create table payments(
   payID int primary key auto_increment,
   payBooking int,
   payAmount decimal(17,4),
   payMethod varchar(20),
   payTrnRef varchar(50),
   payStatus tinyint,
   payDateTime timestamp
) ENGINE = InnoDB;

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
('Karson', '', 'System Administrator', '');

ALTER TABLE users ADD FOREIGN KEY (usrIndividual) REFERENCES individuals (indID);
ALTER TABLE organizers ADD FOREIGN KEY (orgContactPerson) REFERENCES individuals (indID);
ALTER TABLE shows ADD FOREIGN KEY (shwOrganizer) REFERENCES organizers (orgID);
ALTER TABLE showTickets ADD FOREIGN KEY (shtShow) REFERENCES shows (shwID);
ALTER TABLE bookings ADD FOREIGN KEY (bokTicket) REFERENCES showTickets (shtID);
ALTER TABLE bookings ADD FOREIGN KEY (bokIndividual) REFERENCES individuals (indID);
ALTER TABLE payments ADD FOREIGN KEY (payBooking) REFERENCES bookings (bokID);