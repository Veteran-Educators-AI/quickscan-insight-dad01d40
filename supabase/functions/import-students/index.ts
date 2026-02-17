/**
 * ============================================================================
 * IMPORT STUDENTS EDGE FUNCTION (TEMPORARY - DELETE AFTER USE)
 * ============================================================================
 * 
 * One-time bulk import of students from CSV data into classes.
 * Imports 117 students across 4 class periods.
 * 
 * DELETE THIS FUNCTION AFTER SUCCESSFUL IMPORT.
 * 
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CSV data for each period
const PERIOD_4_CSV = `First Name,Last Name,Email
NANA KWADWO DUAH,AMOFA,nanakwadwoduaha@nycstudents.net
Sukanya,Brehon,sukanyab5@nycstudents.net
Mikayah,Burden,mikayahb@nycstudents.net
Justin,Canales Umanzor,justinc1027@nycstudents.net
Jazmine,Charles,jazminec3@nycstudents.net
Ahsan,Chaudhry,ahsanc6@nycstudents.net
Haleema,Chaudhry,haleemac2@nycstudents.net
Sander,Do,sanderd@nycstudents.net
Maleeya,Espaillat,maleeyae@nycstudents.net
Khalid,Farah,khalidf2@nycstudents.net
Banafshe,Flaicha,banafshe@nycstudents.net
Kimon,Flaicha,kimonf@nycstudents.net
Kevin,Hernandez,kevinh2193@nycstudents.net
Yuleisy,Hernandez Capellan,yuleisyh@nycstudents.net
Daniel,Hickman,danielh272@nycstudents.net
Jessica,Huang,jessicah277@nycstudents.net
Ayan Mustafa,Jama,ayanmustafaj@nycstudents.net
Sahal,Jama,sahalj2@nycstudents.net
Raven,Johnson,ravenj18@nycstudents.net
Ethan,Kwok,ethank22@nycstudents.net
Jorge,Lopez,jorgel312@nycstudents.net
Hamza,Osman,hamzao@nycstudents.net
Saul,Parimango,saulp@nycstudents.net
Neha,Paul,nehap2@nycstudents.net
Ahnaf,Samsul,ahnafs@nycstudents.net
Dina,Shamin,dinas@nycstudents.net
JERMAINE,Soto,jermaineso@nycstudents.net
Delia,Soza Jimenez,delias@nycstudents.net
Kyanne,Williams,kyannew2@nycstudents.net`;

const PERIOD_6_CSV = `First Name,Last Name,Email
Irshan,Ahamad,irshana@nycstudents.net
Abdulaziz,Alawi,abdulaziza2840@nycstudents.net
Abraham,Ali,abrahama80@nycstudents.net
Steve,Amon Rea,stevea29@nycstudents.net
Josue,Arevalo Montepeque,josuea48@nycstudents.net
Muhammad,Azhim,muhammada223@nycstudents.net
Fahim,Bosu,fahimb2@nycstudents.net
Mark Anthony,Cajamarca Cabrera,markanthonyc@nycstudents.net
Kiarra,Cain,kiarrac2@nycstudents.net
YADIRA,DELGADO,yadira@nycstudents.net
Janaeya,Flournoy,janaeyaf@nycstudents.net
Amaya,Haddy,amayah4@nycstudents.net
Amira,Hajji,amirah9@nycstudents.net
IBRAHIM,HAMED,ibrahimha@nycstudents.net
YASSIN,HASSAN,yassinh2@nycstudents.net
Tahsin,Howlader,tahsinh@nycstudents.net
Hamza,Hussain,hamzah56@nycstudents.net
ALEZANDRU,JEMCI,alexandruj@nycstudents.net
AKANJI,JUNIOR,akanjij@nycstudents.net
Tamim,Khan,tamimk28@nycstudents.net
Ali Hassan,Khatib,alihassank@nycstudents.net
Fatime,Kone,fatimek@nycstudents.net
Mira,Lewis,miral16@nycstudents.net
Hamdi,Mohamed,hamdim6@nycstudents.net
Mahdi,Mohamed,mahdim24@nycstudents.net
Fahad,Mollah,fahadm4@nycstudents.net
Alejandro,Mosquera,alejandrom313@nycstudents.net
VICTOR,NDIAYE,victorn66@nycstudents.net
Jerone,Parrilla,jeronep@nycstudents.net
Mamadou,Sano,mamadous2@nycstudents.net
Elamin,Sharif,elamine@nycstudents.net
Fahad,Sheikh,fahads6@nycstudents.net
Demetrius,Shorter,demetriuss@nycstudents.net
Haniya,Uddin,haniyau@nycstudents.net
Amiah,Valentin,amiahv@nycstudents.net
Naba,Zaman,nabaz@nycstudents.net`;

const PERIOD_8_CSV = `First Name,Last Name,Email
Santos Edmilson,Aguilar Lopez,santosedmilsona@nycstudents.net
Haroun,Ahmed,harouna2@nycstudents.net
Omar,Ali,omara225@nycstudents.net
Sadiya,Ali,sadiyaa3@nycstudents.net
NAHIARA,ALVAREZ,nahiaraa@nycstudents.net
Salmaun,Chowdhury,salmauncho@nycstudents.net
Angelica,Cordova,angelicac46@nycstudents.net
Andrea,Cruz,andreac288@nycstudents.net
Jhoselin,De Los Santos,jhoselinde@nycstudents.net
Raysa,Espinal,raysae@nycstudents.net
Abdul,Fofana,abdulf2@nycstudents.net
Zihan,Hossain,zihanh3@nycstudents.net
Gabriel,Jimenes,gabrielj76@nycstudents.net
Reylyn,Kerrigan,reylynk@nycstudents.net
Tanvi,Malla,tanvim@nycstudents.net
Kelly,Martinez Villegas,kellym169@nycstudents.net
MOHAMED AWEIS,MOHAMED,mohamedaweism@nycstudents.net
Tamia,Muhammad,tamiam3@nycstudents.net
Daniel,Narvaez,danieln129@nycstudents.net
Kayla,Parrilla,kaylap41@nycstudents.net
Emily,Sanchez,emilys426@nycstudents.net
Maleeya,Wilson,maleeya.wilson@nycstudents.net`;

const PERIOD_9_CSV = `First Name,Last Name,Email
Afiya,Agard,afiyaa2@nycstudents.net
MEILIN,CALIXTO,mellinc@nycstudents.net
Josue,Cifuentes Signor,googleclassroom-auto-108623102871392483734@googleclassroom.com
Angkan,Debnath,angkand2789@nycstudents.net
Maria Gissel,Dominguez Avila,mariagissel@nycstudents.net
JUMARLEE,DOSORUTH,jumarlee@nycstudents.net
ALEXANDRA,FERMIN,alexandraf13@nycstudents.net
Kiara,Garcia,kiarag76@nycstudents.net
Samantha,Garcia,samanthag414@nycstudents.net
Karen,Gomez,kareng184@nycstudents.net
Joseph,Hernandez,josephh333@nycstudents.net
Nojebe,Ishmael,nojebei@nycstudents.net
CHAIMAA,JIDDOU,chaimaaj@nycstudents.net
Hifza,Khan,hifzak3@nycstudents.net
Nafisha,Khan,nafisha@nycstudents.net
Nusayba,Khan,nusaybak@nycstudents.net
NABARASHEN,LATCHMAN,nabarashenl@nycstudents.net
Yahya,Mohamed,yahyam37@nycstudents.net
Seamus,Nembhard,seamusn@nycstudents.net
JOSE,OVALLES,joseo41@nycstudents.net
Aidan,Perez,aidanp18@nycstudents.net
Leanna,Pryce,leannap@nycstudents.net
Omar,Rahman,omarr132@nycstudents.net
Md,Rasel,mdr@nycstudents.net
Daniel,Salazar Moreno,daniels620@nycstudents.net
Hamza,Shahid,hamzas59@nycstudents.net
Sazim,Shahria,sazims@nycstudents.net
Darielyn,Solano,darielyns@nycstudents.net
Nahiara,Subero,nahiaras@nycstudents.net
Marvin,Tejada Castillo,marvint6@nycstudents.net
Abdullahi,Thomas,abdullahit2@nycstudents.net
ALEXANDER,TJHEN,alexandert37@nycstudents.net
Zaire,Tucker,zairet@nycstudents.net
Emily,Urena,emilyu12@nycstudents.net
Christopher,Vo,christopherv106@nycstudents.net
Arianys,Williams,arianyswi@nycstudents.net`;

function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const students = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    students.push({
      firstName: values[0],
      lastName: values[1],
      email: values[2]
    });
  }
  
  return students;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse all CSV data
    const period4Students = parseCSV(PERIOD_4_CSV);
    const period6Students = parseCSV(PERIOD_6_CSV);
    const period8Students = parseCSV(PERIOD_8_CSV);
    const period9Students = parseCSV(PERIOD_9_CSV);

    console.log(`Parsed students: Period 4 (${period4Students.length}), Period 6 (${period6Students.length}), Period 8 (${period8Students.length}), Period 9 (${period9Students.length})`);

    const results = {
      period4: { created: 0, skipped: 0, enrolled: 0 },
      period6: { created: 0, skipped: 0, enrolled: 0 },
      period8: { created: 0, skipped: 0, enrolled: 0 },
      period9: { created: 0, skipped: 0, enrolled: 0 },
    };

    // Import function for each period
    async function importPeriod(students: any[], periodName: string, className: string) {
      // First, get or create the class
      const { data: existingClass, error: classQueryError } = await supabase
        .from('classes')
        .select('id')
        .eq('name', className)
        .single();

      let classId;
      if (existingClass) {
        classId = existingClass.id;
        console.log(`Found existing class: ${className} (${classId})`);
      } else {
        // Create the class
        const { data: newClass, error: classError } = await supabase
          .from('classes')
          .insert({ name: className, period: periodName })
          .select('id')
          .single();

        if (classError) throw classError;
        classId = newClass.id;
        console.log(`Created new class: ${className} (${classId})`);
      }

      // Import students
      for (const student of students) {
        // Check if student already exists
        const { data: existing } = await supabase
          .from('students')
          .select('id')
          .eq('email', student.email)
          .single();

        let studentId;
        if (existing) {
          studentId = existing.id;
          results[periodName].skipped++;
        } else {
          // Create student
          const { data: newStudent, error: studentError } = await supabase
            .from('students')
            .insert({
              first_name: student.firstName,
              last_name: student.lastName,
              email: student.email,
            })
            .select('id')
            .single();

          if (studentError) {
            console.error(`Error creating student ${student.email}:`, studentError);
            continue;
          }
          studentId = newStudent.id;
          results[periodName].created++;
        }

        // Enroll student in class (check if already enrolled)
        const { data: enrollment } = await supabase
          .from('class_enrollments')
          .select('id')
          .eq('student_id', studentId)
          .eq('class_id', classId)
          .single();

        if (!enrollment) {
          const { error: enrollmentError } = await supabase
            .from('class_enrollments')
            .insert({
              student_id: studentId,
              class_id: classId,
            });

          if (enrollmentError) {
            console.error(`Error enrolling student ${student.email}:`, enrollmentError);
          } else {
            results[periodName].enrolled++;
          }
        }
      }
    }

    // Import all periods
    await importPeriod(period4Students, 'period4', 'Period 4');
    await importPeriod(period6Students, 'period6', 'Period 6');
    await importPeriod(period8Students, 'period8', 'Period 8');
    await importPeriod(period9Students, 'period9', 'Period 9');

    const totalCreated = results.period4.created + results.period6.created + results.period8.created + results.period9.created;
    const totalSkipped = results.period4.skipped + results.period6.skipped + results.period8.skipped + results.period9.skipped;
    const totalEnrolled = results.period4.enrolled + results.period6.enrolled + results.period8.enrolled + results.period9.enrolled;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Import complete. Created ${totalCreated} students, skipped ${totalSkipped} existing, enrolled ${totalEnrolled} students`,
        details: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
