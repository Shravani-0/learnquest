import type { QueryResult } from '@/lib/types'

export type ProgressStep = {
  id: string
  label: string
  body?: string
  objective?: string
  tables?: string[]
  storyEvent: string
  xp: number
  detect: (query: string, result: QueryResult) => boolean
  isKillerStep?: boolean
  isMastermindStep?: boolean
}

export type SchemaRelationship = {
  from: string
  fromCol: string
  to: string
  toCol: string
}

export type MysteryConfig = {
  id: number
  title: string
  setting: string
  db: Record<string, Record<string, string | number | null>[]>
  schema: Record<string, string[]>
  schemaRelationships?: SchemaRelationship[]
  killerName: string
  mastermindName?: string
  intro: string
  progressSteps: ProgressStep[]
  hints: { title: string; hints: string[] }[]
  starterQuery: string
  starterQueries: string[]
}

// ─── Level 1 ─────────────────────────────────────────────────────────────────
// Concepts: SELECT, WHERE, LIKE, ORDER BY, LIMIT
const level1: MysteryConfig = {
  id: 1,
  title: 'The Riverside Case',
  setting: 'River City · January 3, 2024',
  killerName: 'Sophie Renner',
  intro:
    'A murder was committed on **January 3, 2024** in **River City**. Start by querying the **crime_scene_report** table to find details about the case.',
  db: {
    crime_scene_report: [
      {
        date: 20240103,
        type: 'murder',
        description:
          "A body was found near the old bridge on River Walk. One witness saw the suspect flee. They live at the highest-numbered address on Maple Lane.",
        city: 'River City',
      },
      { date: 20240101, type: 'theft', description: 'Bicycle stolen outside River City Library.', city: 'River City' },
      { date: 20240105, type: 'assault', description: 'Brawl outside The Rusty Hook bar.', city: 'River City' },
    ],
    person: [
      { id: 10023, name: 'Diane Foster', address_number: 15, address_street_name: 'Maple Lane', ssn: '111222333' },
      { id: 20045, name: 'Carlos Reyes', address_number: 8, address_street_name: 'Oak Street', ssn: '222333444' },
      { id: 31337, name: 'Sophie Renner', address_number: 15, address_street_name: 'Harbor Blvd', ssn: '333444555' },
      { id: 42001, name: 'Tom Briggs', address_number: 22, address_street_name: 'Pine Road', ssn: '444555666' },
      { id: 55123, name: 'Nina Park', address_number: 31, address_street_name: 'Maple Lane', ssn: '555666777' },
      { id: 67890, name: 'Marcus Webb', address_number: 67, address_street_name: 'Maple Lane', ssn: '666777888' },
      { id: 78234, name: 'Leo Santos', address_number: 12, address_street_name: 'Creek Ave', ssn: '777888999' },
      { id: 89001, name: 'Rita Cho', address_number: 44, address_street_name: 'River Walk', ssn: '888999000' },
    ],
    interview: [
      {
        person_id: 20045,
        transcript:
          "I was leaving the library around 3 pm on New Year's Day when I saw a guy yank a green bicycle off the rack out front. He was in his mid-thirties, grey hoodie, dark backpack. He rode off east down Oak Street. I shouted but he was already gone. I reported it to the front desk.",
      },
      {
        person_id: 42001,
        transcript:
          "I was at The Rusty Hook on the night of January 5th — the fight broke out maybe twenty minutes after I arrived. Two men arguing over a pool shot, then one threw a bottle. Staff kicked them both out. I didn't know either of them. The one who threw the bottle had a sleeve tattoo on his left arm.",
      },
      {
        person_id: 67890,
        transcript:
          "I was walking near the bridge when I heard a scream. I saw a woman running toward the parking lot — short blonde hair, red jacket. Her first name was Sophie; I've seen her at the corner store before.",
      },
      {
        person_id: 78234,
        transcript:
          "I had nothing to do with anything. I was home all evening on the 3rd. I did hear sirens around 10 pm from the direction of the bridge but I didn't go outside. Don't know a Sophie, don't know a Marcus.",
      },
      {
        person_id: 89001,
        transcript:
          "I live right on River Walk so I heard the commotion. I looked out my window and saw police tape going up near the old bridge. Earlier that evening I noticed an unfamiliar woman standing by the bridge railing — maybe 9 pm — but I couldn't make out her face from my window. I went back inside. Didn't think much of it at the time.",
      },
    ],
  },
  schema: {
    crime_scene_report: ['date', 'type', 'description', 'city'],
    person: ['id', 'name', 'address_number', 'address_street_name', 'ssn'],
    interview: ['person_id', 'transcript'],
  },
  progressSteps: [
    {
      id: 'crimeFound',
      label: 'The Crime',
      body: 'A murder was committed on January 3, 2024 in River City. Start by pulling the crime scene report to see what the detective recorded about the scene.',
      objective: 'Find the crime scene report for the murder.',
      tables: ['crime_scene_report'],
      xp: 100,
      storyEvent:
        "🔍 **Crime Scene Located!** The murder happened near the old bridge. One witness came forward — they live at the highest-numbered address on **Maple Lane**.",
      detect: (q, r) => q.includes('crime_scene_report') && q.includes('murder') && r.rowCount > 0,
    },
    {
      id: 'witnessFound',
      label: 'The Witness',
      body: 'The report says one witness saw the killer flee. They live at the highest-numbered address on Maple Lane. Find them in the person table using their address.',
      objective: 'Identify the witness by their address on Maple Lane.',
      tables: ['person'],
      xp: 75,
      storyEvent:
        '👁️ **Witness Identified!** Marcus Webb (id: 67890) — the last resident on Maple Lane. He saw the killer that night. Read his **interview**.',
      detect: (q, r) => q.includes('maple lane') && r.rowCount > 0,
    },
    {
      id: 'interviewRead',
      label: 'The Interview',
      body: "Pull Marcus Webb's interview transcript. He describes what the killer looked like — key details that will narrow your suspect list.",
      objective: "Read Marcus Webb's interview statement.",
      tables: ['interview'],
      xp: 150,
      storyEvent:
        '📝 **Witness Statement!** Marcus saw a woman with **short blonde hair** in a **red jacket**. Her first name was **Sophie**. Find her in the person table.',
      detect: (q, r) =>
        q.includes('interview') && r.rowCount > 0 && r.rows.some(row => row['transcript'] !== undefined || row['person_id'] !== undefined),
    },
    {
      id: 'killerFound',
      label: 'The Killer',
      body: 'The witness gave you a name and description — short blonde hair, red jacket, first name Sophie. Search the person table to identify her.',
      objective: "Submit Sophie's full name to close the case.",
      tables: ['person'],
      xp: 300,
      storyEvent:
        '⚡ **Case Closed!** Sophie Renner — identified from the witness description. Lives on Harbor Blvd. The River City PD has her in custody.',
      isKillerStep: true,
      detect: (_q, r) => r.rows.some(row => String(row['name'] ?? '').toLowerCase() === 'sophie renner'),
    },
  ],
  hints: [
    {
      title: 'Finding the Crime Scene Report',
      hints: [
        'Filter crime_scene_report by the date, type of crime, and city.',
        "Use WHERE date = 20240103 AND type = 'murder' AND city = 'River City'",
        "SELECT * FROM crime_scene_report WHERE date = 20240103 AND type = 'murder' AND city = 'River City'",
      ],
    },
    {
      title: 'Finding the Witness',
      hints: [
        'The witness lives at the HIGHEST address number on Maple Lane. Use ORDER BY and LIMIT.',
        'ORDER BY address_number DESC LIMIT 1 returns the last house.',
        "SELECT * FROM person WHERE address_street_name = 'Maple Lane' ORDER BY address_number DESC LIMIT 1",
      ],
    },
    {
      title: 'Reading the Interview',
      hints: [
        'You found Marcus Webb (id: 67890). Query the interview table for his statement.',
        'Filter by person_id = 67890.',
        'SELECT * FROM interview WHERE person_id = 67890',
      ],
    },
    {
      title: 'Identifying the Killer',
      hints: [
        "Marcus said her first name is Sophie. Use LIKE to search the person table by name.",
        "LIKE 'Sophie%' will match any name starting with Sophie.",
        "SELECT * FROM person WHERE name LIKE 'Sophie%'",
      ],
    },
  ],
  starterQuery: "SELECT * FROM crime_scene_report\nWHERE date = 20240103\n  AND type = 'murder'\n  AND city = 'River City'",
  starterQueries: [
    'SELECT * FROM crime_scene_report LIMIT 5',
    'SELECT * FROM person LIMIT 5',
    "SELECT * FROM crime_scene_report WHERE type = 'murder'",
  ],
}

// ─── Level 2 ─────────────────────────────────────────────────────────────────
// Concepts: JOIN, IN, LIKE with %
const level2: MysteryConfig = {
  id: 2,
  title: 'The Harbor Job',
  setting: 'Harbor Town · February 15, 2024',
  killerName: 'Marco Deluca',
  intro:
    'A dock worker was found dead in **Harbor Town** on **February 15, 2024**. Two witnesses came forward. Start by checking the **crime_scene_report** to find out who they are.',
  db: {
    crime_scene_report: [
      {
        date: 20240215,
        type: 'murder',
        description:
          "A dock worker was found dead at Pier 7. Two witnesses came forward. The first lives at number 12 on Canal Street. The second is named Petra and lives on Bay Road.",
        city: 'Harbor Town',
      },
      { date: 20240212, type: 'theft', description: 'Navigation equipment stolen from docked vessel.', city: 'Harbor Town' },
      { date: 20240218, type: 'assault', description: 'Fight reported near the cargo loading area.', city: 'Harbor Town' },
    ],
    person: [
      { id: 11200, name: 'Jake Horner', address_number: 12, address_street_name: 'Canal Street', ssn: '100200300' },
      { id: 13450, name: 'Petra Vasquez', address_number: 8, address_street_name: 'Bay Road', ssn: '200300400' },
      { id: 22700, name: 'Marco Deluca', address_number: 34, address_street_name: 'Anchor Way', ssn: '300400500' },
      { id: 35600, name: 'Grace Kim', address_number: 7, address_street_name: 'Pier Lane', ssn: '400500600' },
      { id: 44512, name: 'Chen Huang', address_number: 19, address_street_name: 'Harbor Blvd', ssn: '500600700' },
      { id: 58900, name: 'Ravi Patel', address_number: 5, address_street_name: 'Canal Street', ssn: '600700800' },
      { id: 67100, name: 'Diana Wolfe', address_number: 22, address_street_name: 'Shipyard Rd', ssn: '700800900' },
      { id: 75300, name: 'Oscar Nduka', address_number: 3, address_street_name: 'Bay Road', ssn: '800900100' },
    ],
    vehicle_registry: [
      { id: 5001, person_id: 11200, plate_number: 'HARB01K', car_make: 'Toyota', car_model: 'Corolla' },
      { id: 5002, person_id: 22700, plate_number: 'XR79HAR', car_make: 'Ford', car_model: 'F-150' },
      { id: 5003, person_id: 35600, plate_number: 'PIER55Z', car_make: 'Honda', car_model: 'Civic' },
      { id: 5004, person_id: 44512, plate_number: 'MXR720B', car_make: 'Chevrolet', car_model: 'Silverado' },
      { id: 5005, person_id: 67100, plate_number: 'WOLF99P', car_make: 'Nissan', car_model: 'Altima' },
      { id: 5006, person_id: 75300, plate_number: 'BAY415T', car_make: 'Subaru', car_model: 'Forester' },
    ],
    interview: [
      {
        person_id: 11200,
        transcript:
          "The car sped off right after the shot. I caught part of the plate — it had 'XR7' in it. Dark Ford pickup truck.",
      },
      {
        person_id: 13450,
        transcript:
          "I heard it too. Jake's description is right — that Ford pickup had been parked at Pier 7 for about 20 minutes before it happened.",
      },
    ],
  },
  schema: {
    crime_scene_report: ['date', 'type', 'description', 'city'],
    person: ['id', 'name', 'address_number', 'address_street_name', 'ssn'],
    vehicle_registry: ['id', 'person_id', 'plate_number', 'car_make', 'car_model'],
    interview: ['person_id', 'transcript'],
  },
  progressSteps: [
    {
      id: 'crimeFound',
      label: 'Crime Found',
      xp: 100,
      storyEvent:
        '🔍 **Crime Scene Located!** Murder at Pier 7, Harbor Town. Two witnesses: one at **12 Canal Street**, another named **Petra** on Bay Road.',
      detect: (q, r) => q.includes('crime_scene_report') && q.includes('murder') && r.rowCount > 0,
    },
    {
      id: 'witnessesFound',
      label: 'Witnesses Found',
      xp: 100,
      storyEvent:
        '👁️ **Witnesses Located!** Jake Horner (11200) and Petra Vasquez (13450). Query the **interview** table to read what they saw.',
      detect: (q, r) => (q.includes('canal street') || q.includes('petra')) && r.rowCount > 0,
    },
    {
      id: 'interviewsRead',
      label: 'Interviews Read',
      xp: 150,
      storyEvent:
        "📝 **Witnesses Spoke!** The getaway vehicle had **'XR7'** in the plate number — a dark **Ford pickup**. JOIN **person** with **vehicle_registry** to find the owner.",
      detect: (q, r) =>
        q.includes('interview') &&
        (q.includes('11200') || q.includes('13450') || q.includes(' in ')) &&
        r.rowCount > 0,
    },
    {
      id: 'killerFound',
      label: 'Killer Found',
      xp: 350,
      storyEvent:
        "⚡ **Case Closed!** Plate **XR79HAR** is registered to **Marco Deluca**, 34 Anchor Way. His Ford F-150 was at the scene. Arrested.",
      isKillerStep: true,
      detect: (q, r) =>
        q.includes('xr7') &&
        r.rows.some(
          row =>
            String(row['name'] ?? '').toLowerCase() === 'marco deluca' ||
            String(row['plate_number'] ?? '').toUpperCase().includes('XR7')
        ),
    },
  ],
  hints: [
    {
      title: 'Finding the Crime Scene Report',
      hints: [
        "Filter crime_scene_report for a murder in Harbor Town on February 15, 2024.",
        "WHERE date = 20240215 AND type = 'murder' AND city = 'Harbor Town'",
        "SELECT * FROM crime_scene_report WHERE date = 20240215 AND type = 'murder' AND city = 'Harbor Town'",
      ],
    },
    {
      title: 'Finding the Two Witnesses',
      hints: [
        "First: address_number = 12, address_street_name = 'Canal Street'. Second: name starts with 'Petra'.",
        'Use OR to find both in one query, or run two separate queries.',
        "SELECT * FROM person WHERE (address_street_name = 'Canal Street' AND address_number = 12) OR name LIKE 'Petra%'",
      ],
    },
    {
      title: 'Reading Both Interviews',
      hints: [
        'Witnesses are Jake (11200) and Petra (13450). Use IN to get both interviews at once.',
        'WHERE person_id IN (11200, 13450) fetches both rows.',
        'SELECT * FROM interview WHERE person_id IN (11200, 13450)',
      ],
    },
    {
      title: 'Tracking the Vehicle',
      hints: [
        "The plate contains 'XR7'. JOIN person with vehicle_registry to find the owner.",
        "JOIN on p.id = v.person_id, then WHERE v.plate_number LIKE '%XR7%'",
        "SELECT p.* FROM person p JOIN vehicle_registry v ON p.id = v.person_id WHERE v.plate_number LIKE '%XR7%'",
      ],
    },
  ],
  starterQuery:
    "SELECT * FROM crime_scene_report\nWHERE date = 20240215\n  AND type = 'murder'\n  AND city = 'Harbor Town'",
  starterQueries: [
    'SELECT * FROM crime_scene_report LIMIT 5',
    'SELECT * FROM person LIMIT 5',
    'SELECT * FROM vehicle_registry LIMIT 5',
  ],
}

// ─── Level 3 ─────────────────────────────────────────────────────────────────
// Concepts: Multiple JOINs, GROUP BY, HAVING, COUNT, subqueries
const level3: MysteryConfig = {
  id: 3,
  title: 'The SQL City Conspiracy',
  setting: 'SQL City · January 15, 2018',
  killerName: 'Jeremy Bowers',
  mastermindName: 'Miranda Priestly',
  intro:
    "A crime has taken place and the detective needs your help. The crime was a **murder** that occurred on **January 15, 2018** in **SQL City**. The detective left the precinct immediately. Start by checking the **crime_scene_report** table.",
  db: {
    crime_scene_report: [
      {
        date: 20180101,
        type: 'robbery',
        description: 'A theft at the Central Bank vault.',
        city: 'SQL City',
      },
      { date: 20180112, type: 'assault', description: 'A brawl outside Neon Lounge.', city: 'SQL City' },
      {
        date: 20180115,
        type: 'murder',
        description:
          "Security footage shows two witnesses. The first witness lives at the last house on 'Northwestern Dr'. The second witness, named Annabel, lives somewhere on 'Franklin Ave'.",
        city: 'SQL City',
      },
      { date: 20180116, type: 'theft', description: 'Jewelry stolen from uptown boutique.', city: 'SQL City' },
      {
        date: 20180120,
        type: 'murder',
        description: 'Victim found at the docks. Single witness: a dock worker, last name starts with V.',
        city: 'Gotham',
      },
    ],
    person: [
      { id: 10101, name: 'Alex Vance', license_id: 202001, address_number: 12, address_street_name: 'Elm St', ssn: '100100100' },
      { id: 10202, name: 'Brenda Liu', license_id: 202002, address_number: 55, address_street_name: 'Oak Ave', ssn: '200200200' },
      { id: 14887, name: 'Morty Schapiro', license_id: 118009, address_number: 4919, address_street_name: 'Northwestern Dr', ssn: '111564949' },
      { id: 16371, name: 'Annabel Miller', license_id: 490173, address_number: 103, address_street_name: 'Franklin Ave', ssn: '318771143' },
      { id: 28819, name: 'Joe Germuska', license_id: 173289, address_number: 111, address_street_name: 'Fisk Rd', ssn: '138909730' },
      { id: 29800, name: 'Rachel Moscowitz', license_id: 423327, address_number: 202, address_street_name: 'Northwestern Dr', ssn: '201401121' },
      { id: 36377, name: 'Carla Sparagna', license_id: 391433, address_number: 1170, address_street_name: 'Dogwood Way', ssn: '285178022' },
      { id: 48173, name: 'Amanda Wilkerson', license_id: 227073, address_number: 561, address_street_name: 'Eastern Pkwy', ssn: '879541917' },
      { id: 57000, name: 'Trina Nguyen', license_id: 165230, address_number: 80, address_street_name: 'Franklin Ave', ssn: '611991908' },
      { id: 67318, name: 'Jeremy Bowers', license_id: 423327, address_number: 530, address_street_name: 'Washington Pl, Apt 3A', ssn: '871539279' },
      { id: 78193, name: 'Nathan Mustoe', license_id: 312915, address_number: 14, address_street_name: 'Maple Ln', ssn: '390938247' },
      { id: 90700, name: 'Miranda Priestly', license_id: 202298, address_number: 1883, address_street_name: 'Golden Ave', ssn: '987756388' },
      { id: 91652, name: 'Red Korb', license_id: 918773, address_number: 537, address_street_name: 'Dawnhaven Ct', ssn: '961388910' },
      { id: 99716, name: 'Eva Gloor', license_id: 337509, address_number: 43, address_street_name: 'Lakeview Blvd', ssn: '600691578' },
    ],
    drivers_license: [
      { id: 118009, age: 68, height: 63, eye_color: 'blue', hair_color: 'grey', gender: 'male', plate_number: 'HV83H4L', car_make: 'Nissan', car_model: 'Altima' },
      { id: 165230, age: 24, height: 66, eye_color: 'brown', hair_color: 'black', gender: 'female', plate_number: 'Y68R7PG', car_make: 'Honda', car_model: 'Civic' },
      { id: 173289, age: 42, height: 70, eye_color: 'green', hair_color: 'blonde', gender: 'male', plate_number: '23AM106', car_make: 'Chevrolet', car_model: 'Silverado' },
      { id: 202001, age: 34, height: 71, eye_color: 'grey', hair_color: 'brown', gender: 'male', plate_number: 'XGT1042', car_make: 'Ford', car_model: 'F-150' },
      { id: 202002, age: 29, height: 64, eye_color: 'blue', hair_color: 'red', gender: 'female', plate_number: 'ZAP9934', car_make: 'Tesla', car_model: 'Model 3' },
      { id: 202298, age: 68, height: 66, eye_color: 'green', hair_color: 'red', gender: 'female', plate_number: '500123', car_make: 'Tesla', car_model: 'Model S' },
      { id: 227073, age: 33, height: 67, eye_color: 'hazel', hair_color: 'brown', gender: 'female', plate_number: 'TJ2N5PM', car_make: 'Toyota', car_model: 'Camry' },
      { id: 312915, age: 27, height: 72, eye_color: 'blue', hair_color: 'black', gender: 'male', plate_number: '9QT88AG', car_make: 'Dodge', car_model: 'Ram' },
      { id: 337509, age: 31, height: 65, eye_color: 'brown', hair_color: 'blonde', gender: 'female', plate_number: '4ZW30MR', car_make: 'Volkswagen', car_model: 'Golf' },
      { id: 390938, age: 55, height: 68, eye_color: 'blue', hair_color: 'grey', gender: 'female', plate_number: 'MM5H1VO', car_make: 'Mercedes', car_model: 'E-Class' },
      { id: 391433, age: 48, height: 62, eye_color: 'hazel', hair_color: 'brown', gender: 'female', plate_number: 'OOBWY89', car_make: 'Subaru', car_model: 'Outback' },
      { id: 423327, age: 30, height: 70, eye_color: 'brown', hair_color: 'brown', gender: 'male', plate_number: '0H42W2X', car_make: 'Chevrolet', car_model: 'Spark LS' },
      { id: 490173, age: 26, height: 64, eye_color: 'green', hair_color: 'blonde', gender: 'female', plate_number: 'WQLL78F', car_make: 'Toyota', car_model: 'Prius' },
      { id: 918773, age: 22, height: 69, eye_color: 'blue', hair_color: 'black', gender: 'male', plate_number: 'NHTF91P', car_make: 'Honda', car_model: 'Accord' },
    ],
    facebook_event_checkin: [
      { person_id: 10101, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171201 },
      { person_id: 16371, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171201 },
      { person_id: 16371, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171215 },
      { person_id: 48173, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171209 },
      { person_id: 48173, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171215 },
      { person_id: 48173, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171229 },
      { person_id: 57000, event_id: 1002, event_name: 'Tech Expo 2017', date: 20171210 },
      { person_id: 67318, event_id: 1003, event_name: "New Year's Gala", date: 20171231 },
      { person_id: 90700, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171206 },
      { person_id: 90700, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171212 },
      { person_id: 90700, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171229 },
      { person_id: 91652, event_id: 1004, event_name: 'Hackathon Central', date: 20171210 },
      { person_id: 99716, event_id: 1001, event_name: 'SQL Symphony Concert', date: 20171205 },
    ],
    interview: [
      {
        person_id: 14887,
        transcript:
          "I heard a gunshot and then saw a man run out. He had a 'Get Fit Now Gym' bag. The membership number on the bag started with '48Z'. Only gold members have those bags. The man got into a car with a plate that included 'H42W'.",
      },
      {
        person_id: 16371,
        transcript:
          'I saw the murder happen, and I recognized the killer from my gym when I was working out last week on January the 9th.',
      },
      {
        person_id: 67318,
        transcript:
          "I was hired by a woman with a lot of money. She's around 5'5\" (65\") or 5'7\" (67\"). She has red hair and she drives a Tesla Model S. I know that she attended the SQL Symphony Concert 3 times in December 2017.",
      },
      {
        person_id: 28819,
        transcript: "I was minding my own business when the whole thing went down. I didn't see a thing.",
      },
      { person_id: 90700, transcript: 'No comment.' },
    ],
    get_fit_now_member: [
      { id: '48Z7A', person_id: 28819, name: 'Joe Germuska', membership_start_date: 20160305, membership_status: 'gold' },
      { id: '48Z55', person_id: 67318, name: 'Jeremy Bowers', membership_start_date: 20160101, membership_status: 'gold' },
      { id: '90081', person_id: 16371, name: 'Annabel Miller', membership_start_date: 20160208, membership_status: 'gold' },
      { id: 'X90K1', person_id: 36377, name: 'Carla Sparagna', membership_start_date: 20170101, membership_status: 'silver' },
      { id: 'XTE42', person_id: 78193, name: 'Nathan Mustoe', membership_start_date: 20151101, membership_status: 'silver' },
      { id: '2AE3R', person_id: 10101, name: 'Alex Vance', membership_start_date: 20180101, membership_status: 'regular' },
    ],
    get_fit_now_check_in: [
      { membership_id: '48Z7A', check_in_date: 20180109, check_in_time: 1600, check_out_time: 1730 },
      { membership_id: '48Z55', check_in_date: 20180109, check_in_time: 1530, check_out_time: 1700 },
      { membership_id: '90081', check_in_date: 20180109, check_in_time: 1610, check_out_time: 1700 },
      { membership_id: 'X90K1', check_in_date: 20180115, check_in_time: 900, check_out_time: 1030 },
      { membership_id: 'XTE42', check_in_date: 20180109, check_in_time: 800, check_out_time: 930 },
      { membership_id: '48Z55', check_in_date: 20180112, check_in_time: 1200, check_out_time: 1300 },
      { membership_id: '2AE3R', check_in_date: 20180115, check_in_time: 700, check_out_time: 800 },
    ],
    income: [
      { ssn: '100100100', annual_income: 85000 },
      { ssn: '200200200', annual_income: 62000 },
      { ssn: '111564949', annual_income: 42000 },
      { ssn: '318771143', annual_income: 57000 },
      { ssn: '138909730', annual_income: 73000 },
      { ssn: '201401121', annual_income: 91000 },
      { ssn: '871539279', annual_income: 68000 },
      { ssn: '987756388', annual_income: 8400000 },
      { ssn: '961388910', annual_income: 55000 },
      { ssn: '600691578', annual_income: 48000 },
    ],
  },
  schema: {
    crime_scene_report: ['date', 'type', 'description', 'city'],
    person: ['id', 'name', 'license_id', 'address_number', 'address_street_name', 'ssn'],
    drivers_license: ['id', 'age', 'height', 'eye_color', 'hair_color', 'gender', 'plate_number', 'car_make', 'car_model'],
    facebook_event_checkin: ['person_id', 'event_id', 'event_name', 'date'],
    interview: ['person_id', 'transcript'],
    get_fit_now_member: ['id', 'person_id', 'name', 'membership_start_date', 'membership_status'],
    get_fit_now_check_in: ['membership_id', 'check_in_date', 'check_in_time', 'check_out_time'],
    income: ['ssn', 'annual_income'],
  },
  schemaRelationships: [
    { from: 'person', fromCol: 'license_id', to: 'drivers_license', toCol: 'id' },
    { from: 'person', fromCol: 'ssn', to: 'income', toCol: 'ssn' },
    { from: 'person', fromCol: 'id', to: 'facebook_event_checkin', toCol: 'person_id' },
    { from: 'person', fromCol: 'id', to: 'interview', toCol: 'person_id' },
    { from: 'person', fromCol: 'id', to: 'get_fit_now_member', toCol: 'person_id' },
    { from: 'get_fit_now_member', fromCol: 'id', to: 'get_fit_now_check_in', toCol: 'membership_id' },
  ],
  progressSteps: [
    {
      id: 'crimeFound',
      label: 'The Crime',
      body: 'A murder was committed on Jan 15, 2018 in SQL City. Security footage shows two witnesses were at the scene. Pull the crime scene report to begin your investigation.',
      objective: 'Find the crime scene report for the murder.',
      tables: ['crime_scene_report'],
      xp: 100,
      storyEvent:
        '🔍 **Crime Scene Found!** You discovered the murder report. Two witnesses saw something that night — find them both.',
      detect: (q, r) => q.includes('crime_scene_report') && q.includes('murder') && r.rowCount > 0,
    },
    {
      id: 'witness1Found',
      label: 'Witnesses',
      body: 'The report names two witnesses. The first lives at the last house on Northwestern Dr. The second, named Annabel, lives somewhere on Franklin Ave. Find them both in the person table.',
      objective: 'Identify both witnesses using their addresses.',
      tables: ['person'],
      xp: 75,
      storyEvent:
        '👁️ **Witness #1 Located!** Morty Schapiro, the last resident on Northwestern Dr. He saw the killer flee.',
      detect: (q, r) => q.includes('northwestern dr') && r.rowCount > 0,
    },
    {
      id: 'witness2Found',
      label: 'Witnesses',
      body: 'The report names two witnesses. The first lives at the last house on Northwestern Dr. The second, named Annabel, lives somewhere on Franklin Ave. Find them both in the person table.',
      objective: 'Identify Annabel Miller on Franklin Ave.',
      tables: ['person'],
      xp: 75,
      storyEvent:
        "👁️ **Witness #2 Located!** Annabel Miller on Franklin Ave. She recognized the killer from her gym!",
      detect: (q, r) =>
        (q.includes('annabel') ||
          (q.includes('franklin ave') && r.rows.some(row => String(row['name'] ?? '').toLowerCase().includes('annabel')))) &&
        r.rowCount > 0,
    },
    {
      id: 'interviewsRead',
      label: 'Interviews',
      body: "Pull each witness's transcript from the interview table. They describe a man at the gym with a 'Get Fit Now' bag, a numbered membership, and a car seen fleeing the scene.",
      objective: 'Read both witness interview transcripts.',
      tables: ['interview'],
      xp: 150,
      storyEvent:
        '📝 **Interviews Obtained!** Gold gym member with ID starting **"48Z"**, checked in Jan 9th. Car plate contained **"H42W"**.',
      detect: (q, r) =>
        q.includes('interview') && (q.includes('14887') || q.includes('16371')) && r.rowCount > 0,
    },
    {
      id: 'suspectFound',
      label: 'The Suspect',
      body: 'Cross-reference gym check-ins, membership rosters, and driver\'s licenses against the witness clues — gym bag with "48Z" prefix, checked in Jan 9th, plate containing "H42W".',
      objective: 'Find the one person matching every clue.',
      tables: ['get_fit_now_member', 'get_fit_now_check_in', 'drivers_license', 'person'],
      xp: 200,
      storyEvent:
        '🎯 **Primary Suspect Identified!** Gold gym member, matching plate. Read their **interview** transcript immediately.',
      detect: (q, r) => (q.includes('get_fit_now') || q.includes('h42w')) && r.rowCount > 0,
    },
    {
      id: 'killerNamed',
      label: 'The Killer',
      body: 'One name now stands out. Submit your accusation in the verdict box. The killer\'s own interview will then hint at someone who hired them — a wealthy patron.',
      objective: 'Submit the murderer\'s name to close the first case.',
      tables: ['interview'],
      xp: 300,
      storyEvent:
        "⚡ **Killer Confesses!** Jeremy Bowers admits it — and reveals he was **HIRED**. Mastermind: female, red hair, Tesla Model S, SQL Symphony Concert 3× in December 2017.",
      isKillerStep: true,
      detect: (q, r) => q.includes('interview') && q.includes('67318') && r.rowCount > 0,
    },
    {
      id: 'mastermindFound',
      label: 'The Mastermind',
      body: 'The killer was hired by a wealthy patron who attended the SQL Symphony Concert 3 times in December 2017. Trace the money through the income table and events to expose them.',
      objective: 'Submit the mastermind\'s name to fully solve the case.',
      tables: ['facebook_event_checkin', 'income', 'person'],
      xp: 400,
      storyEvent:
        '🕵️ **Mastermind Uncovered!** Miranda Priestly — income $8.4M, three SQL Symphony Concert appearances in December. Case SOLVED.',
      isMastermindStep: true,
      detect: (q, r) => (q.includes('tesla') || (q.includes('symphony') && q.includes('count'))) && r.rowCount > 0,
    },
  ],
  hints: [
    {
      title: 'Finding the Crime Scene Report',
      hints: [
        'Start with the crime_scene_report table.',
        "Filter by date = 20180115, type = 'murder', and city = 'SQL City'.",
        "SELECT * FROM crime_scene_report WHERE date = 20180115 AND type = 'murder' AND city = 'SQL City'",
      ],
    },
    {
      title: 'Finding the Witnesses',
      hints: [
        "The first witness lives at the LAST house on Northwestern Dr. Use ORDER BY and LIMIT.",
        "The second witness is named 'Annabel' on Franklin Ave.",
        "SELECT * FROM person WHERE address_street_name = 'Northwestern Dr' ORDER BY address_number DESC LIMIT 1",
      ],
    },
    {
      title: 'Reading the Interviews',
      hints: [
        'Once you have both witness IDs (14887 and 16371), query the interview table.',
        'Use IN to get both at once: WHERE person_id IN (14887, 16371)',
        'SELECT * FROM interview WHERE person_id IN (14887, 16371)',
      ],
    },
    {
      title: 'Tracking the Gym Suspect',
      hints: [
        "A gold gym member whose ID starts with '48Z' checked in on Jan 9th, 2018.",
        "JOIN get_fit_now_member with get_fit_now_check_in on membership_id. Filter for gold status and check_in_date = 20180109.",
        "SELECT m.* FROM get_fit_now_member m JOIN get_fit_now_check_in c ON m.id = c.membership_id WHERE m.id LIKE '48Z%' AND m.membership_status = 'gold' AND c.check_in_date = 20180109",
      ],
    },
    {
      title: 'The Plate Number',
      hints: [
        "The car plate contains 'H42W'. Join person with drivers_license.",
        "Filter WHERE dl.plate_number LIKE '%H42W%'",
        "SELECT p.* FROM person p JOIN drivers_license dl ON p.license_id = dl.id WHERE dl.plate_number LIKE '%H42W%'",
      ],
    },
  ],
  starterQuery:
    "SELECT * FROM crime_scene_report\nWHERE date = 20180115\n  AND type = 'murder'\n  AND city = 'SQL City'",
  starterQueries: [
    'SELECT * FROM crime_scene_report LIMIT 5',
    'SELECT * FROM person LIMIT 5',
    "SELECT * FROM crime_scene_report WHERE type = 'murder'",
  ],
}

const mysteries: Record<number, MysteryConfig> = { 1: level1, 2: level2, 3: level3 }

export function getMystery(level: number): MysteryConfig {
  return mysteries[level] ?? level1
}

export const MYSTERY_COUNT = Object.keys(mysteries).length
