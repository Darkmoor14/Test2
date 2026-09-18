-- Real data migrated from the old Supabase Cloud project ("Vila Silvia",
-- ref gyvqgeqrogspmnhjwlse), pulled live via the Supabase MCP connection.
-- extras, expenses and maintenance were empty on the old project, so
-- nothing to seed there. The one existing push_subscriptions row isn't
-- carried over — it will be invalid anyway once new VAPID keys are
-- generated for this instance, so that device just needs to re-subscribe.

insert into public.reservations (id, guest, phone, room, room_number, source, status, checkin, checkout, price, group_id, guests) values
(7,'Marius Savulescu','','Standard',2,'booking','reserved','2026-08-28','2026-08-30',0,null,null),
(8,'Dorina Chiriac','','Standard',2,'booking','reserved','2026-08-23','2026-08-24',0,null,null),
(9,'SEBESTYEN CSABA','','Standard',5,'booking','reserved','2026-08-24','2026-08-25',0,null,null),
(10,'Victor Cristian Mitroi','','Standard',2,'booking','checkedin','2026-09-03','2026-09-05',0,null,2),
(11,'Gabriela Cucos','','Standard',5,'booking','reserved','2026-10-10','2026-10-12',0,null,2),
(12,'Enea Remus-Constantin','','Standard',2,'booking','reserved','2026-10-10','2026-10-12',0,null,2),
(13,'Zólyomi Ádám','','Standard',2,'booking','reserved','2026-10-23','2026-10-25',0,null,2),
(15,'Vica Dumitriu','','Standard',3,'booking','checkedin','2026-09-03','2026-09-04',0,'grp1788275305198',2),
(16,'Vica Dumitriu','','Standard',4,'booking','checkedin','2026-09-03','2026-09-04',0,'grp1788275305198',2),
(17,'Vica Dumitriu','','Standard',6,'booking','checkedin','2026-09-03','2026-09-04',0,'grp1788275305198',2),
(18,'GABRIELA IANCU','','Standard',3,'booking','reserved','2026-10-10','2026-10-12',0,null,2),
(19,'GABRIELA IANCU','','Standard',4,'booking','reserved','2026-10-10','2026-10-12',0,null,2),
(20,'Ovidiu Cadar','','Standard',3,'booking','checkedin','2026-09-04','2026-09-06',0,null,2),
(21,'Vicol Elena','','Standard',5,'booking','reserved','2026-08-28','2026-08-31',0,null,2),
(22,'Stelian Lache','','Standard',2,'booking','reserved','2026-09-21','2026-09-22',0,null,2),
(23,'Judit Katalin Ulrich','','Standard',2,'booking','reserved','2026-09-18','2026-09-19',0,null,2),
(24,'Moharos Pál Lászlóné','','Standard',2,'booking','reserved','2026-09-14','2026-09-16',0,null,2),
(25,'Iustina Avasilcai','','Standard',3,'booking','reserved','2026-09-18','2026-09-19',0,null,2),
(26,'Trifan Bogdan','','Standard',5,'booking','reserved','2026-09-18','2026-09-19',0,null,2),
(27,'Csóré Attila','','Standard',2,'booking','checkedin','2026-09-09','2026-09-12',0,null,2);

select setval(pg_get_serial_sequence('public.reservations','id'), (select max(id) from public.reservations));

insert into public.room_prices (room_type, price, base_occupancy, extra_person_price) values
('Apartament', 620, 4, 50),
('Standard', 396.43, 2, 50),
('StandardNoBalcony', 376.61, 2, 50);

insert into public.services (id, name, price) values
('massage','Masaj',120),
('sauna','Saună',80);

insert into public.minibar (id, name, price, stock) values
('cola','Cola',10,24),
('snacks','Gustări',12,20),
('water','Apă',6,30);
