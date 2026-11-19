USE nestwell_bt;

-- Password hash below corresponds to: NestWell@2026
SET @DEMO_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK72';

INSERT INTO users (id, full_name, email, phone, password_hash, role, is_email_verified, avatar_url, dzongkhag, address)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Karma Wangchuk (Admin)', 'admin@nestwell.bt', '+975-17110001', @DEMO_HASH, 'ADMIN', TRUE, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', 'Thimphu', 'Norzin Lam, Thimphu'),
  ('22222222-2222-4222-8222-222222222222', 'Tashi Dorji', 'tashi.dorji@example.bt', '+975-17220002', @DEMO_HASH, 'PARENT', TRUE, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80', 'Thimphu', 'Motithang, Thimphu'),
  ('33333333-3333-4333-8333-333333333333', 'Dechen Wangmo', 'dechen.wangmo@example.bt', '+975-17330003', @DEMO_HASH, 'CARETAKER', TRUE, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80', 'Thimphu', 'Babesa, Thimphu'),
  ('44444444-4444-4444-8444-444444444444', 'Pema Lhamo', 'pema.lhamo@example.bt', '+975-17440004', @DEMO_HASH, 'CARETAKER', TRUE, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80', 'Paro', 'Tshongdue, Paro'),
  ('55555555-5555-4555-8555-555555555555', 'Yangchen Dolma', 'yangchen.dolma@example.bt', '+975-17550005', @DEMO_HASH, 'CARETAKER', TRUE, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80', 'Phuentsholing', 'Kabreytar, Phuentsholing'),
  ('66666666-6666-4666-8666-666666666666', 'Sonam Choden', 'sonam.choden@example.bt', '+975-17660006', @DEMO_HASH, 'CARETAKER', TRUE, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80', 'Thimphu', 'Changzamtog, Thimphu');

INSERT INTO caretaker_profiles (
  user_id, bio, years_experience, qualifications, skills_json, languages_json,
  hourly_rate_btn, daily_rate_btn, monthly_rate_btn, verification_status,
  id_document_path, verified_by, verified_at, is_available, avg_rating, total_reviews
) VALUES
  (
    '33333333-3333-4333-8333-333333333333',
    'Certified Early Childhood Care & Development (ECCD) facilitator with 7 years of experience nurturing infants and toddlers in Thimphu households. Calm, patient, and trained in pediatric first aid.',
    7,
    'ECCD Diploma (Paro College of Education), Pediatric First Aid Certified',
    '["Infant Care", "Early Literacy", "Nutritious Meal Prep", "Pediatric First Aid", "Montessori Play"]',
    '["Dzongkha", "English", "Tshangla"]',
    250.00, 1400.00, 22000.00, 'APPROVED',
    'uploads/verified-cid-dechen.pdf', '11111111-1111-4111-8111-111111111111', NOW(), TRUE, 4.92, 14
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Dedicated full-time nanny specializing in structured daily routines, bilingual Dzongkha-English storytelling, and school-readiness support for children aged 1 to 8.',
    5,
    'Diploma in Nursing Assistant & Child Nutrition',
    '["Toddler Routines", "Homework Supervision", "Bilingual Storytelling", "Hygiene & Safety"]',
    '["Dzongkha", "English"]',
    220.00, 1250.00, 19500.00, 'APPROVED',
    'uploads/verified-cid-pema.pdf', '11111111-1111-4111-8111-111111111111', NOW(), TRUE, 4.85, 9
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'Warm and dependable childcare specialist experienced with twins and multi-child households. Committed to stable 6-to-12 month family placements.',
    8,
    'Senior Caregiver Certificate, Red Cross Child Safety Training',
    '["Twin & Multi-Child Care", "Newborn Sleep Routine", "Healthy Cooking", "Outdoor Play"]',
    '["Dzongkha", "English", "Lhotshamkha"]',
    260.00, 1500.00, 24000.00, 'APPROVED',
    'uploads/verified-cid-yangchen.pdf', '11111111-1111-4111-8111-111111111111', NOW(), TRUE, 4.96, 18
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'Former preschool teaching assistant seeking a long-term nanny placement in Thimphu. Creative, attentive, and deeply passionate about child development.',
    3,
    'Certificate in Early Childhood Education',
    '["Creative Arts", "Toddler Care", "School Drop-off & Pickup"]',
    '["Dzongkha", "English"]',
    200.00, 1100.00, 17500.00, 'PENDING',
    'uploads/pending-cid-sonam.pdf', NULL, NULL, TRUE, 0.00, 0
  );

INSERT INTO children (id, parent_id, full_name, date_of_birth, allergies, medical_notes, special_instructions)
VALUES
  ('77777777-7777-4777-8777-777777777777', '22222222-2222-4222-8222-222222222222', 'Rigzin Dorji', '2023-04-14', 'None', 'Up to date on all immunizations', 'Afternoon nap from 1:00 PM to 2:30 PM; enjoys picture books.');

INSERT INTO bookings (
  id, parent_id, caretaker_id, child_id, start_date, end_date, duration_months,
  billing_arrangement, agreed_monthly_rate_btn, estimated_total_btn, parent_notes, status
) VALUES (
  '88888888-8888-4888-8888-888888888888',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '77777777-7777-4777-8777-777777777777',
  DATE_ADD(CURDATE(), INTERVAL 14 DAY),
  DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 14 DAY), INTERVAL 6 MONTH),
  6,
  'MONTHLY_INSTALLMENT',
  22000.00,
  132000.00,
  'Weekday care from 8:30 AM to 5:30 PM at our residence in Motithang.',
  'CONFIRMED'
);

INSERT INTO notifications (id, user_id, type, title, message, reference_id, is_read)
VALUES
  ('99999999-9999-4999-8999-999999999991', '22222222-2222-4222-8222-222222222222', 'BOOKING_CONFIRMED', '6-Month Contract Confirmed', 'Your 6-month childcare contract with Dechen Wangmo is confirmed.', '88888888-8888-4888-8888-888888888888', FALSE),
  ('99999999-9999-4999-8999-999999999992', '11111111-1111-4111-8111-111111111111', 'VERIFICATION_PENDING', 'New Caretaker Verification Request', 'Sonam Choden submitted Citizenship ID documents for verification.', '66666666-6666-4666-8666-666666666666', FALSE);
