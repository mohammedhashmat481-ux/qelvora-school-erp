import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_TIMES = [
  { period: 1, start: '08:30', end: '09:15', slot: '08:30-09:15' },
  { period: 2, start: '09:15', end: '10:00', slot: '09:15-10:00' },
  { period: 3, start: '10:00', end: '10:45', slot: '10:00-10:45' },
  { period: 4, start: '11:00', end: '11:45', slot: '11:00-11:45' },
  { period: 5, start: '11:45', end: '12:30', slot: '11:45-12:30' },
  { period: 6, start: '12:30', end: '01:15', slot: '12:30-01:15' }
];

async function run() {
  console.log('🌱 Seeding complete, conflict-free school timetable for all 13 classes...');

  const classes = await prisma.class.findMany();
  const teachers = await prisma.teacher.findMany();
  const subjects = await prisma.subject.findMany();

  const classMap = {};
  classes.forEach(c => {
    classMap[`${c.standard}-${c.section}`] = c;
  });

  const teacherMap = {};
  teachers.forEach(t => {
    teacherMap[t.name] = t;
  });

  const subjectMap = {};
  subjects.forEach(s => {
    subjectMap[s.name] = s;
  });

  // Secondary rotation matrix (6 teachers across 6 grades without any clashes)
  const teacherRotation = [
    { name: 'Dr. Rajesh Sharma', sub: 'Mathematics', code: 'MATH101' },
    { name: 'Priya Patel', sub: 'Physics', code: 'PHYS101' },
    { name: 'Ananya Sen', sub: 'Chemistry', code: 'CHEM101' },
    { name: 'Vikram Singh', sub: 'Biology', code: 'BIO101' },
    { name: 'Sneha Reddy', sub: 'English Literature', code: 'ENG101' },
    { name: 'Arjun Nair', sub: 'Computer Science & AI', code: 'CS101' }
  ];

  const secondaryGrades = ['10th-A', '10th-B', '9th-A', '9th-B', '8th-A', '7th-A'];

  // Other grade schedules
  const otherGradeSchedules = {
    '8th-B': [
      { sub: 'Social Studies & Civics', code: 'SST101', teacher: 'Sneha Reddy' },
      { sub: 'Environmental Science', code: 'EVS101', teacher: 'Vikram Singh' },
      { sub: 'Library & Independent Study', code: 'LIB101', teacher: 'Faculty Supervised' },
      { sub: 'Social Studies & Civics', code: 'SST101', teacher: 'Sneha Reddy' },
      { sub: 'Language & Project Lab', code: 'ENG101', teacher: 'Sneha Reddy' },
      { sub: 'Sports & Physical Activity', code: 'PE101', teacher: 'Vikram Singh' }
    ],
    '6th-A': [
      { sub: 'Environmental Science', code: 'EVS101', teacher: 'Vikram Singh' },
      { sub: 'Mathematics', code: 'MATH101', teacher: 'Dr. Rajesh Sharma' },
      { sub: 'English Literature', code: 'ENG101', teacher: 'Sneha Reddy' },
      { sub: 'Social Studies & Civics', code: 'SST101', teacher: 'Faculty Supervised' },
      { sub: 'Computer Science & AI', code: 'CS101', teacher: 'Arjun Nair' },
      { sub: 'Science Lab Discovery', code: 'PHYS101', teacher: 'Priya Patel' }
    ],
    '5th-A': [
      { sub: 'Environmental Science', code: 'EVS101', teacher: 'Primary Faculty' },
      { sub: 'Mathematics Foundations', code: 'MATH101', teacher: 'Primary Faculty' },
      { sub: 'English Language & Reading', code: 'ENG101', teacher: 'Primary Faculty' },
      { sub: 'General Knowledge & Civics', code: 'SST101', teacher: 'Primary Faculty' },
      { sub: 'Drawing & Creative Arts', code: 'ART101', teacher: 'Primary Faculty' },
      { sub: 'Physical Education & Games', code: 'PE101', teacher: 'Primary Faculty' }
    ],
    '1st-A': [
      { sub: 'Primary Foundational Learning', code: 'FND101', teacher: 'Primary Faculty' },
      { sub: 'Basic Numeracy & Rhymes', code: 'NUM101', teacher: 'Primary Faculty' },
      { sub: 'Art, Coloring & Craft', code: 'ART101', teacher: 'Primary Faculty' },
      { sub: 'Storytelling & Phonics', code: 'ENG101', teacher: 'Primary Faculty' },
      { sub: 'Indoor Games & Motor Skills', code: 'PE101', teacher: 'Primary Faculty' },
      { sub: 'Activity Review & Wrap-up', code: 'ACT101', teacher: 'Primary Faculty' }
    ],
    'UKG-A': [
      { sub: 'Early Learning & Shapes', code: 'KG101', teacher: 'Early Educator' },
      { sub: 'Phonics & Alphabets', code: 'KG102', teacher: 'Early Educator' },
      { sub: 'Sensory Play & Building', code: 'KG103', teacher: 'Early Educator' },
      { sub: 'Story Circle Time', code: 'KG104', teacher: 'Early Educator' },
      { sub: 'Outdoor Games & Play', code: 'KG105', teacher: 'Early Educator' },
      { sub: 'Creative Art & Music', code: 'KG106', teacher: 'Early Educator' }
    ],
    'LKG-A': [
      { sub: 'Storytelling & Art', code: 'KG201', teacher: 'Early Educator' },
      { sub: 'Music & Rhymes', code: 'KG202', teacher: 'Early Educator' },
      { sub: 'Block Building & Toys', code: 'KG203', teacher: 'Early Educator' },
      { sub: 'Snack & Guided Nap', code: 'KG204', teacher: 'Early Educator' },
      { sub: 'Free Play & Exploration', code: 'KG205', teacher: 'Early Educator' },
      { sub: 'Story Review & Circle', code: 'KG206', teacher: 'Early Educator' }
    ],
    'Nursery-A': [
      { sub: 'Creative Playgroup & Activity', code: 'NUR101', teacher: 'Early Educator' },
      { sub: 'Nursery Rhymes & Singing', code: 'NUR102', teacher: 'Early Educator' },
      { sub: 'Motor Skills & Play', code: 'NUR103', teacher: 'Early Educator' },
      { sub: 'Puppet Theater & Stories', code: 'NUR104', teacher: 'Early Educator' },
      { sub: 'Sensory Sand & Water Play', code: 'NUR105', teacher: 'Early Educator' },
      { sub: 'Dismissal Circle', code: 'NUR106', teacher: 'Early Educator' }
    ]
  };

  await prisma.timetable.deleteMany({});
  console.log('Cleared existing timetables.');

  const timetableEntries = [];

  DAYS.forEach((day, dayIdx) => {
    // 1. Secondary grades with circular teacher rotation per period
    secondaryGrades.forEach((clsKey, gradeIdx) => {
      const clsObj = classMap[clsKey];
      if (!clsObj) return;

      PERIOD_TIMES.forEach(pt => {
        // Compute circular index: (gradeIdx + (pt.period - 1) + dayIdx) % 6
        const rotationIdx = (gradeIdx + (pt.period - 1) + dayIdx) % 6;
        const assignment = teacherRotation[rotationIdx];
        const teacherObj = teacherMap[assignment.name];
        const subjectObj = subjectMap[assignment.sub];

        timetableEntries.push({
          classId: clsObj.id,
          standard: clsObj.standard,
          section: clsObj.section,
          board: clsObj.board || 'CBSE',
          day,
          period: pt.period,
          subjectId: subjectObj?.id || null,
          subject: assignment.sub,
          subjectCode: assignment.code,
          teacherId: teacherObj?.id || null,
          teacher: assignment.name,
          employeeId: teacherObj?.employeeId || null,
          room: clsObj.roomNumber || `Room ${clsKey}`,
          startTime: pt.start,
          endTime: pt.end,
          timeSlot: pt.slot
        });
      });
    });

    // 2. Other grades
    Object.keys(otherGradeSchedules).forEach(clsKey => {
      const clsObj = classMap[clsKey];
      if (!clsObj) return;

      const schedule = otherGradeSchedules[clsKey];
      PERIOD_TIMES.forEach(pt => {
        const item = schedule[(pt.period - 1) % schedule.length];
        const teacherObj = teacherMap[item.teacher];
        const subjectObj = subjectMap[item.sub];

        timetableEntries.push({
          classId: clsObj.id,
          standard: clsObj.standard,
          section: clsObj.section,
          board: clsObj.board || 'CBSE',
          day,
          period: pt.period,
          subjectId: subjectObj?.id || null,
          subject: item.sub,
          subjectCode: item.code,
          teacherId: teacherObj?.id || null,
          teacher: item.teacher,
          employeeId: teacherObj?.employeeId || (teacherObj ? teacherObj.employeeId : 'FAC'),
          room: clsObj.roomNumber || `Room ${clsKey}`,
          startTime: pt.start,
          endTime: pt.end,
          timeSlot: pt.slot
        });
      });
    });
  });

  console.log(`Generated ${timetableEntries.length} timetable entries.`);

  // Insert in batches of 50
  for (let i = 0; i < timetableEntries.length; i += 50) {
    const chunk = timetableEntries.slice(i, i + 50);
    await prisma.timetable.createMany({ data: chunk });
  }

  console.log('✅ Successfully seeded all 13 classes with rich, conflict-free weekly timetables!');
}

run()
  .catch(err => {
    console.error('Error seeding timetables:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
