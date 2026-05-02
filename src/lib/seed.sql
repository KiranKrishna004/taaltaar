INSERT INTO songs (title, film, language, composer, difficulty, bpm, alphatex, tab_data, youtube_url) VALUES

-- 1. Munbe Vaa
('Munbe Vaa', 'Sillunu Oru Kaadhal', 'tamil', 'AR Rahman', 'beginner', 90,
'\title "Munbe Vaa"
\tempo 90
\tuning E4 B3 G3 D3 A2 E2
.
:4 5.5 5.5 7.5 5.5 | :4 4.5 2.5 0.5 r | :4 2.5 4.5 5.5 r | :4 5.5 7.5 9.5 7.5 |
:4 5.5 4.5 2.5 r | :4 5.5 5.5 4.5 2.5 | :4 0.5 2.5 4.5 r |',
'[
  {"time":0.0,"string":5,"fret":5,"duration":0.4,"note":"D4"},
  {"time":0.4,"string":5,"fret":5,"duration":0.4,"note":"D4"},
  {"time":0.8,"string":5,"fret":7,"duration":0.4,"note":"E4"},
  {"time":1.2,"string":5,"fret":5,"duration":0.4,"note":"D4"},
  {"time":1.6,"string":5,"fret":4,"duration":0.4,"note":"C#4"},
  {"time":2.0,"string":5,"fret":2,"duration":0.4,"note":"B3"},
  {"time":2.4,"string":5,"fret":0,"duration":0.6,"note":"A3"},
  {"time":3.0,"string":5,"fret":2,"duration":0.4,"note":"B3"},
  {"time":3.4,"string":5,"fret":4,"duration":0.4,"note":"C#4"},
  {"time":3.8,"string":5,"fret":5,"duration":0.4,"note":"D4"},
  {"time":4.4,"string":5,"fret":5,"duration":0.4,"note":"D4"},
  {"time":4.8,"string":5,"fret":7,"duration":0.4,"note":"E4"},
  {"time":5.2,"string":5,"fret":9,"duration":0.4,"note":"F#4"},
  {"time":5.6,"string":5,"fret":7,"duration":0.4,"note":"E4"},
  {"time":6.0,"string":5,"fret":5,"duration":0.4,"note":"D4"},
  {"time":6.4,"string":5,"fret":4,"duration":0.4,"note":"C#4"},
  {"time":6.8,"string":5,"fret":2,"duration":0.4,"note":"B3"}
]'::jsonb, null),

-- 2. Kannaana Kanney
('Kannaana Kanney', 'Viswasam', 'tamil', 'D. Imman', 'beginner', 72,
'\title "Kannaana Kanney"
\tempo 72
\tuning E4 B3 G3 D3 A2 E2
.
:4 0.6 2.6 3.6 0.6 | :4 2.5 0.5 r r | :4 3.6 5.6 7.6 5.6 | :4 3.6 2.6 0.6 r |
:4 0.6 3.6 5.6 7.6 | :4 5.6 3.6 2.6 0.6 | :4 3.5 5.5 7.5 r |',
'[
  {"time":0.0,"string":6,"fret":0,"duration":0.5,"note":"E2"},
  {"time":0.5,"string":6,"fret":2,"duration":0.5,"note":"F#2"},
  {"time":1.0,"string":6,"fret":3,"duration":0.5,"note":"G2"},
  {"time":1.5,"string":6,"fret":0,"duration":0.5,"note":"E2"},
  {"time":2.0,"string":5,"fret":2,"duration":0.5,"note":"B3"},
  {"time":2.5,"string":5,"fret":0,"duration":0.8,"note":"A3"},
  {"time":3.3,"string":6,"fret":3,"duration":0.5,"note":"G2"},
  {"time":3.8,"string":6,"fret":5,"duration":0.5,"note":"A2"},
  {"time":4.3,"string":6,"fret":7,"duration":0.5,"note":"B2"},
  {"time":4.8,"string":6,"fret":5,"duration":0.5,"note":"A2"},
  {"time":5.3,"string":6,"fret":3,"duration":0.5,"note":"G2"},
  {"time":5.8,"string":6,"fret":2,"duration":0.5,"note":"F#2"},
  {"time":6.3,"string":6,"fret":0,"duration":0.8,"note":"E2"},
  {"time":7.1,"string":6,"fret":0,"duration":0.5,"note":"E2"},
  {"time":7.6,"string":6,"fret":3,"duration":0.5,"note":"G2"},
  {"time":8.1,"string":6,"fret":5,"duration":0.5,"note":"A2"},
  {"time":8.6,"string":6,"fret":7,"duration":0.8,"note":"B2"}
]'::jsonb, null),

-- 3. Nenjukkul Peythidum
('Nenjukkul Peythidum', 'Vaaranam Aayiram', 'tamil', 'Harris Jayaraj', 'beginner', 80,
'\title "Nenjukkul Peythidum"
\tempo 80
\tuning E4 B3 G3 D3 A2 E2
.
:4 7.5 5.5 4.5 2.5 | :4 0.5 r 2.5 4.5 | :4 5.5 7.5 9.5 7.5 | :4 5.5 4.5 2.5 r |
:4 7.5 9.5 7.5 5.5 | :4 4.5 2.5 0.5 r |',
'[
  {"time":0.0,"string":5,"fret":7,"duration":0.45,"note":"E4"},
  {"time":0.45,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":0.9,"string":5,"fret":4,"duration":0.45,"note":"C#4"},
  {"time":1.35,"string":5,"fret":2,"duration":0.45,"note":"B3"},
  {"time":1.8,"string":5,"fret":0,"duration":0.6,"note":"A3"},
  {"time":2.4,"string":5,"fret":2,"duration":0.45,"note":"B3"},
  {"time":2.85,"string":5,"fret":4,"duration":0.45,"note":"C#4"},
  {"time":3.3,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":3.75,"string":5,"fret":7,"duration":0.45,"note":"E4"},
  {"time":4.2,"string":5,"fret":9,"duration":0.45,"note":"F#4"},
  {"time":4.65,"string":5,"fret":7,"duration":0.45,"note":"E4"},
  {"time":5.1,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":5.55,"string":5,"fret":4,"duration":0.45,"note":"C#4"},
  {"time":6.0,"string":5,"fret":2,"duration":0.45,"note":"B3"},
  {"time":6.45,"string":5,"fret":0,"duration":0.8,"note":"A3"}
]'::jsonb, null),

-- 4. Rowdy Baby
('Rowdy Baby', 'Maari 2', 'tamil', 'Yuvan Shankar Raja', 'intermediate', 95,
'\title "Rowdy Baby"
\tempo 95
\tuning E4 B3 G3 D3 A2 E2
.
:8 5.5 5.5 7.5 5.5 4.5 4.5 5.5 r | :8 7.5 7.5 9.5 7.5 5.5 4.5 2.5 r |
:8 5.5 5.5 4.5 2.5 0.5 2.5 4.5 r | :8 5.5 7.5 9.5 7.5 5.5 r r r |',
'[
  {"time":0.0,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":0.3,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":0.6,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":0.9,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":1.2,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":1.5,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":1.8,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":2.4,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":2.7,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":3.0,"string":5,"fret":9,"duration":0.3,"note":"F#4"},
  {"time":3.3,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":3.6,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":3.9,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":4.2,"string":5,"fret":2,"duration":0.5,"note":"B3"},
  {"time":4.7,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":5.0,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":5.3,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":5.6,"string":5,"fret":2,"duration":0.3,"note":"B3"},
  {"time":5.9,"string":5,"fret":0,"duration":0.3,"note":"A3"},
  {"time":6.2,"string":5,"fret":2,"duration":0.3,"note":"B3"},
  {"time":6.5,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":6.8,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":7.1,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":7.4,"string":5,"fret":9,"duration":0.3,"note":"F#4"},
  {"time":7.7,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":8.0,"string":5,"fret":5,"duration":0.8,"note":"D4"}
]'::jsonb, null),

-- 5. Kadhal Rojave
('Kadhal Rojave', 'Roja', 'tamil', 'AR Rahman', 'intermediate', 85,
'\title "Kadhal Rojave"
\tempo 85
\tuning E4 B3 G3 D3 A2 E2
.
:4 0.6 3.6 5.6 7.6 | :4 8.6 7.6 5.6 3.6 | :4 2.6 0.6 r r | :4 0.5 2.5 3.5 5.5 |
:4 7.5 5.5 3.5 2.5 | :4 0.5 r r r |',
'[
  {"time":0.0,"string":6,"fret":0,"duration":0.42,"note":"E2"},
  {"time":0.42,"string":6,"fret":3,"duration":0.42,"note":"G2"},
  {"time":0.84,"string":6,"fret":5,"duration":0.42,"note":"A2"},
  {"time":1.26,"string":6,"fret":7,"duration":0.42,"note":"B2"},
  {"time":1.68,"string":6,"fret":8,"duration":0.42,"note":"C3"},
  {"time":2.1,"string":6,"fret":7,"duration":0.42,"note":"B2"},
  {"time":2.52,"string":6,"fret":5,"duration":0.42,"note":"A2"},
  {"time":2.94,"string":6,"fret":3,"duration":0.42,"note":"G2"},
  {"time":3.36,"string":6,"fret":2,"duration":0.42,"note":"F#2"},
  {"time":3.78,"string":6,"fret":0,"duration":0.8,"note":"E2"},
  {"time":4.58,"string":5,"fret":0,"duration":0.42,"note":"A3"},
  {"time":5.0,"string":5,"fret":2,"duration":0.42,"note":"B3"},
  {"time":5.42,"string":5,"fret":3,"duration":0.42,"note":"C4"},
  {"time":5.84,"string":5,"fret":5,"duration":0.42,"note":"D4"},
  {"time":6.26,"string":5,"fret":7,"duration":0.42,"note":"E4"},
  {"time":6.68,"string":5,"fret":5,"duration":0.42,"note":"D4"},
  {"time":7.1,"string":5,"fret":3,"duration":0.42,"note":"C4"},
  {"time":7.52,"string":5,"fret":2,"duration":0.42,"note":"B3"},
  {"time":7.94,"string":5,"fret":0,"duration":0.8,"note":"A3"}
]'::jsonb, null),

-- 6. Jimikki Kammal
('Jimikki Kammal', 'Velipadinte Pusthakam', 'malayalam', 'Shaan Rahman', 'beginner', 100,
'\title "Jimikki Kammal"
\tempo 100
\tuning E4 B3 G3 D3 A2 E2
.
:8 5.5 5.5 7.5 9.5 7.5 5.5 r r | :8 4.5 4.5 5.5 7.5 5.5 4.5 r r |
:8 2.5 2.5 4.5 5.5 4.5 2.5 r r | :8 0.5 2.5 4.5 5.5 7.5 9.5 r r |',
'[
  {"time":0.0,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":0.3,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":0.6,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":0.9,"string":5,"fret":9,"duration":0.3,"note":"F#4"},
  {"time":1.2,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":1.5,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":1.95,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":2.25,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":2.55,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":2.85,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":3.15,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":3.45,"string":5,"fret":4,"duration":0.45,"note":"C#4"},
  {"time":3.9,"string":5,"fret":2,"duration":0.3,"note":"B3"},
  {"time":4.2,"string":5,"fret":2,"duration":0.3,"note":"B3"},
  {"time":4.5,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":4.8,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":5.1,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":5.4,"string":5,"fret":2,"duration":0.45,"note":"B3"},
  {"time":5.85,"string":5,"fret":0,"duration":0.3,"note":"A3"},
  {"time":6.15,"string":5,"fret":2,"duration":0.3,"note":"B3"},
  {"time":6.45,"string":5,"fret":4,"duration":0.3,"note":"C#4"},
  {"time":6.75,"string":5,"fret":5,"duration":0.3,"note":"D4"},
  {"time":7.05,"string":5,"fret":7,"duration":0.3,"note":"E4"},
  {"time":7.35,"string":5,"fret":9,"duration":0.6,"note":"F#4"}
]'::jsonb, null),

-- 7. Manikya Malaraya Poovi
('Manikya Malaraya Poovi', 'Oru Adaar Love', 'malayalam', 'Shaan Rahman', 'beginner', 80,
'\title "Manikya Malaraya Poovi"
\tempo 80
\tuning E4 B3 G3 D3 A2 E2
.
:4 9.5 7.5 5.5 4.5 | :4 2.5 0.5 r r | :4 4.5 5.5 7.5 9.5 | :4 7.5 5.5 4.5 r |
:4 2.5 4.5 5.5 7.5 | :4 5.5 4.5 2.5 0.5 |',
'[
  {"time":0.0,"string":5,"fret":9,"duration":0.45,"note":"F#4"},
  {"time":0.45,"string":5,"fret":7,"duration":0.45,"note":"E4"},
  {"time":0.9,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":1.35,"string":5,"fret":4,"duration":0.45,"note":"C#4"},
  {"time":1.8,"string":5,"fret":2,"duration":0.45,"note":"B3"},
  {"time":2.25,"string":5,"fret":0,"duration":0.75,"note":"A3"},
  {"time":3.0,"string":5,"fret":4,"duration":0.45,"note":"C#4"},
  {"time":3.45,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":3.9,"string":5,"fret":7,"duration":0.45,"note":"E4"},
  {"time":4.35,"string":5,"fret":9,"duration":0.45,"note":"F#4"},
  {"time":4.8,"string":5,"fret":7,"duration":0.45,"note":"E4"},
  {"time":5.25,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":5.7,"string":5,"fret":4,"duration":0.6,"note":"C#4"},
  {"time":6.3,"string":5,"fret":2,"duration":0.45,"note":"B3"},
  {"time":6.75,"string":5,"fret":4,"duration":0.45,"note":"C#4"},
  {"time":7.2,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":7.65,"string":5,"fret":7,"duration":0.45,"note":"E4"},
  {"time":8.1,"string":5,"fret":5,"duration":0.45,"note":"D4"},
  {"time":8.55,"string":5,"fret":4,"duration":0.45,"note":"C#4"},
  {"time":9.0,"string":5,"fret":2,"duration":0.45,"note":"B3"},
  {"time":9.45,"string":5,"fret":0,"duration":0.75,"note":"A3"}
]'::jsonb, null),

-- 8. Jeevamshamayi
('Jeevamshamayi', 'Theevandi', 'malayalam', 'Rajesh Murugesan', 'intermediate', 76,
'\title "Jeevamshamayi"
\tempo 76
\tuning E4 B3 G3 D3 A2 E2
.
:4 0.5 2.5 4.5 5.5 | :4 7.5 5.5 4.5 2.5 | :4 4.5 5.5 7.5 9.5 | :4 7.5 5.5 r r |
:4 5.5 7.5 9.5 10.5 | :4 9.5 7.5 5.5 r |',
'[
  {"time":0.0,"string":5,"fret":0,"duration":0.47,"note":"A3"},
  {"time":0.47,"string":5,"fret":2,"duration":0.47,"note":"B3"},
  {"time":0.94,"string":5,"fret":4,"duration":0.47,"note":"C#4"},
  {"time":1.41,"string":5,"fret":5,"duration":0.47,"note":"D4"},
  {"time":1.88,"string":5,"fret":7,"duration":0.47,"note":"E4"},
  {"time":2.35,"string":5,"fret":5,"duration":0.47,"note":"D4"},
  {"time":2.82,"string":5,"fret":4,"duration":0.47,"note":"C#4"},
  {"time":3.29,"string":5,"fret":2,"duration":0.47,"note":"B3"},
  {"time":3.76,"string":5,"fret":4,"duration":0.47,"note":"C#4"},
  {"time":4.23,"string":5,"fret":5,"duration":0.47,"note":"D4"},
  {"time":4.7,"string":5,"fret":7,"duration":0.47,"note":"E4"},
  {"time":5.17,"string":5,"fret":9,"duration":0.47,"note":"F#4"},
  {"time":5.64,"string":5,"fret":7,"duration":0.47,"note":"E4"},
  {"time":6.11,"string":5,"fret":5,"duration":0.75,"note":"D4"},
  {"time":6.86,"string":5,"fret":5,"duration":0.47,"note":"D4"},
  {"time":7.33,"string":5,"fret":7,"duration":0.47,"note":"E4"},
  {"time":7.8,"string":5,"fret":9,"duration":0.47,"note":"F#4"},
  {"time":8.27,"string":5,"fret":10,"duration":0.47,"note":"G4"},
  {"time":8.74,"string":5,"fret":9,"duration":0.47,"note":"F#4"},
  {"time":9.21,"string":5,"fret":7,"duration":0.47,"note":"E4"},
  {"time":9.68,"string":5,"fret":5,"duration":0.75,"note":"D4"}
]'::jsonb, null),

-- 9. Thumbi Vaa
('Thumbi Vaa', 'Inaindha Kaigal', 'malayalam', 'Ilayaraja', 'beginner', 78,
'\title "Thumbi Vaa"
\tempo 78
\tuning E4 B3 G3 D3 A2 E2
.
:4 3.5 5.5 3.5 2.5 | :4 0.5 r 0.5 2.5 | :4 3.5 5.5 7.5 5.5 | :4 3.5 2.5 0.5 r |
:4 2.5 3.5 5.5 7.5 | :4 5.5 3.5 2.5 0.5 |',
'[
  {"time":0.0,"string":5,"fret":3,"duration":0.46,"note":"C4"},
  {"time":0.46,"string":5,"fret":5,"duration":0.46,"note":"D4"},
  {"time":0.92,"string":5,"fret":3,"duration":0.46,"note":"C4"},
  {"time":1.38,"string":5,"fret":2,"duration":0.46,"note":"B3"},
  {"time":1.84,"string":5,"fret":0,"duration":0.7,"note":"A3"},
  {"time":2.54,"string":5,"fret":0,"duration":0.46,"note":"A3"},
  {"time":3.0,"string":5,"fret":2,"duration":0.46,"note":"B3"},
  {"time":3.46,"string":5,"fret":3,"duration":0.46,"note":"C4"},
  {"time":3.92,"string":5,"fret":5,"duration":0.46,"note":"D4"},
  {"time":4.38,"string":5,"fret":7,"duration":0.46,"note":"E4"},
  {"time":4.84,"string":5,"fret":5,"duration":0.46,"note":"D4"},
  {"time":5.3,"string":5,"fret":3,"duration":0.46,"note":"C4"},
  {"time":5.76,"string":5,"fret":2,"duration":0.46,"note":"B3"},
  {"time":6.22,"string":5,"fret":0,"duration":0.7,"note":"A3"},
  {"time":6.92,"string":5,"fret":2,"duration":0.46,"note":"B3"},
  {"time":7.38,"string":5,"fret":3,"duration":0.46,"note":"C4"},
  {"time":7.84,"string":5,"fret":5,"duration":0.46,"note":"D4"},
  {"time":8.3,"string":5,"fret":7,"duration":0.46,"note":"E4"},
  {"time":8.76,"string":5,"fret":5,"duration":0.46,"note":"D4"},
  {"time":9.22,"string":5,"fret":3,"duration":0.46,"note":"C4"},
  {"time":9.68,"string":5,"fret":2,"duration":0.46,"note":"B3"},
  {"time":10.14,"string":5,"fret":0,"duration":0.75,"note":"A3"}
]'::jsonb, null),

-- 10. Melle Melle
('Melle Melle', 'Itha Ivide Vare', 'malayalam', 'Raveendran', 'beginner', 70,
'\title "Melle Melle"
\tempo 70
\tuning E4 B3 G3 D3 A2 E2
.
:4 2.5 4.5 5.5 7.5 | :4 5.5 4.5 2.5 r | :4 0.5 2.5 4.5 5.5 | :4 4.5 2.5 0.5 r |
:4 7.5 5.5 4.5 2.5 | :4 0.5 r r r |',
'[
  {"time":0.0,"string":5,"fret":2,"duration":0.5,"note":"B3"},
  {"time":0.5,"string":5,"fret":4,"duration":0.5,"note":"C#4"},
  {"time":1.0,"string":5,"fret":5,"duration":0.5,"note":"D4"},
  {"time":1.5,"string":5,"fret":7,"duration":0.5,"note":"E4"},
  {"time":2.0,"string":5,"fret":5,"duration":0.5,"note":"D4"},
  {"time":2.5,"string":5,"fret":4,"duration":0.5,"note":"C#4"},
  {"time":3.0,"string":5,"fret":2,"duration":0.8,"note":"B3"},
  {"time":3.8,"string":5,"fret":0,"duration":0.5,"note":"A3"},
  {"time":4.3,"string":5,"fret":2,"duration":0.5,"note":"B3"},
  {"time":4.8,"string":5,"fret":4,"duration":0.5,"note":"C#4"},
  {"time":5.3,"string":5,"fret":5,"duration":0.5,"note":"D4"},
  {"time":5.8,"string":5,"fret":4,"duration":0.5,"note":"C#4"},
  {"time":6.3,"string":5,"fret":2,"duration":0.5,"note":"B3"},
  {"time":6.8,"string":5,"fret":0,"duration":0.8,"note":"A3"},
  {"time":7.6,"string":5,"fret":7,"duration":0.5,"note":"E4"},
  {"time":8.1,"string":5,"fret":5,"duration":0.5,"note":"D4"},
  {"time":8.6,"string":5,"fret":4,"duration":0.5,"note":"C#4"},
  {"time":9.1,"string":5,"fret":2,"duration":0.5,"note":"B3"},
  {"time":9.6,"string":5,"fret":0,"duration":0.9,"note":"A3"}
]'::jsonb, null);
