import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(cors()); app.use(express.json());
const here = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(here, '../aptiprep.db'));

type SeedQuestion = [string, string, string, string, string, string, string, number, string];
const questions: SeedQuestion[] = [
 ['Quantitative','Percentages','A price rises from ₹800 to ₹920. What is the percentage increase?','12%','15%','20%','25%',1,'Increase = 120/800 × 100 = 15%.'],
 ['Quantitative','Profit & Loss','A shopkeeper buys an item for ₹500 and sells it for ₹575. Profit percentage is:','10%','12%','15%','20%',2,'Profit = 75; 75/500 × 100 = 15%.'],
 ['Quantitative','Time & Work','A can finish work in 12 days and B in 18 days. Together they finish it in:','6 days','7.2 days','8 days','9 days',1,'Combined rate = 1/12 + 1/18 = 5/36. Time = 36/5 = 7.2 days.'],
 ['Quantitative','Ratio','The ratio 3:5 is equivalent to:','18:25','15:20','21:35','12:25',2,'Multiply both sides by 7: 3:5 = 21:35.'],
 ['Quantitative','Simple Interest','SI on ₹2,000 at 8% per annum for 3 years is:','₹320','₹400','₹480','₹560',2,'SI = PRT/100 = 2000 × 8 × 3 / 100 = ₹480.'],
 ['Quantitative','Averages','The average of 8, 12, 15, 9 and 16 is:','11','12','13','14',1,'Sum is 60; divide by 5 = 12.'],
 ['Logical Reasoning','Series','Find the next number: 2, 6, 12, 20, 30, __','36','40','42','44',2,'Differences are +4, +6, +8, +10, so next is +12.'],
 ['Logical Reasoning','Directions','Ravi walks north, turns right, then turns right again. He now faces:','North','South','East','West',1,'North → East → South.'],
 ['Logical Reasoning','Syllogism','All pens are blue. Some blue things are boxes. Which conclusion follows?','All boxes are pens','Some boxes are blue','No pens are boxes','All blue things are pens',1,'The second statement directly says some boxes are blue.'],
 ['Logical Reasoning','Coding','If CAT is coded as DBU, DOG is coded as:','EPF','EOG','CPH','FQI',0,'Each letter advances one place: D→E, O→P, G→H.'],
 ['Logical Reasoning','Arrangement','Five people sit in a row. If A is at the left end and E at the right end, how many positions can B occupy?','2','3','4','5',1,'B can occupy any of the 3 middle positions.'],
 ['Logical Reasoning','Clocks','At 3:00, the angle between hour and minute hands is:','0°','60°','90°','120°',2,'Minute hand is at 12 and hour hand at 3: 90°.'],
 ['Verbal','Vocabulary','Choose the antonym of “abundant”.','Plentiful','Scarce','Ample','Copious',1,'Scarce means limited or insufficient.'],
 ['Verbal','Grammar','Choose the correct sentence.','She do not like coffee.','She does not likes coffee.','She does not like coffee.','She not like coffee.',2,'After “does not”, use the base verb: like.'],
 ['Verbal','Reading','“Despite the rain, the match continued.” Despite means:','Because of','In spite of','Before','Therefore',1,'Despite introduces a contrast, meaning in spite of.'],
 ['Verbal','Analogy','Book : Read :: Music : __','Write','Listen','Paint','Speak',1,'A book is read; music is listened to.'],
 ['Verbal','Vocabulary','Choose the synonym of “concise”.','Lengthy','Brief','Vague','Complex',1,'Concise means brief and to the point.'],
 ['Verbal','Grammar','Fill in the blank: Neither the teacher nor the students __ late.','was','is','are','be',2,'With “nor”, the verb agrees with the nearer subject: students are.'],
 ['Data Interpretation','Tables','A team sold 120, 150 and 180 units in Q1, Q2 and Q3. Q2 growth over Q1 is:','20%','25%','30%','50%',1,'Growth = 30/120 × 100 = 25%.'],
 ['Data Interpretation','Charts','A pie chart sector is 72°. Its share of the total is:','10%','15%','20%','25%',2,'72/360 = 1/5 = 20%.'],
 ['Data Interpretation','Tables','Revenue grows from ₹4 lakh to ₹5 lakh. The increase is:','15%','20%','25%','30%',2,'Increase = 1/4 × 100 = 25%.'],
 ['Data Interpretation','Ratios','Men:women in a class is 4:6. If total is 50, number of women is:','20','25','30','35',2,'Women = 6/10 × 50 = 30.'],
 ['Quantitative','Speed','A car travels 180 km in 3 hours. Its speed is:','50 km/h','55 km/h','60 km/h','65 km/h',2,'Speed = distance/time = 180/3 = 60 km/h.'],
 ['Logical Reasoning','Series','Find the odd one out: 3, 5, 11, 14, 17','3','5','14','17',2,'14 is not prime; all other numbers are prime.']
];

db.exec(`CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, category TEXT, topic TEXT, prompt TEXT, option_a TEXT, option_b TEXT, option_c TEXT, option_d TEXT, correct_option INTEGER, explanation TEXT);
CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY, started_at TEXT, completed_at TEXT, score INTEGER, total INTEGER, duration_seconds INTEGER);
CREATE TABLE IF NOT EXISTS answers (id INTEGER PRIMARY KEY, attempt_id INTEGER, question_id INTEGER, selected_option INTEGER, is_correct INTEGER, category TEXT);`);
if ((db.prepare('SELECT COUNT(*) as count FROM questions').get() as { count: number }).count === 0) {
 const insert = db.prepare('INSERT INTO questions (category,topic,prompt,option_a,option_b,option_c,option_d,correct_option,explanation) VALUES (?,?,?,?,?,?,?,?,?)');
 const seed = db.transaction(() => questions.forEach(q => insert.run(...q.slice(0, 7), q[7], q[8]))); seed();
}

app.get('/api/health', (_req,res) => res.json({ status: 'ok' }));
app.get('/api/questions', (req,res) => {
 const category = req.query.category as string | undefined; const limit = Math.min(Number(req.query.limit) || 10, 30);
 const rows = category && category !== 'All' ? db.prepare('SELECT * FROM questions WHERE category=? ORDER BY RANDOM() LIMIT ?').all(category, limit) : db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT ?').all(limit);
 res.json(rows);
});
app.post('/api/attempts', (req,res) => {
 const { answers = [], durationSeconds = 0, startedAt = new Date().toISOString() } = req.body;
 let score = 0; const checked = answers.map((a: {questionId:number; selectedOption:number}) => {
   const q = db.prepare('SELECT correct_option, category FROM questions WHERE id=?').get(a.questionId) as {correct_option:number;category:string} | undefined;
   const correct = !!q && q.correct_option === a.selectedOption; if (correct) score++; return {...a, correct, category:q?.category ?? 'Unknown'};
 });
 const attempt = db.prepare('INSERT INTO attempts (started_at,completed_at,score,total,duration_seconds) VALUES (?,?,?,?,?)').run(startedAt,new Date().toISOString(),score,checked.length,durationSeconds);
 const add = db.prepare('INSERT INTO answers (attempt_id,question_id,selected_option,is_correct,category) VALUES (?,?,?,?,?)'); checked.forEach((a: any) => add.run(attempt.lastInsertRowid,a.questionId,a.selectedOption,Number(a.correct),a.category));
 res.json({ id: attempt.lastInsertRowid, score, total: checked.length, results: checked });
});
app.get('/api/analytics', (_req,res) => {
 const attempts = db.prepare('SELECT id, completed_at as date, score, total, duration_seconds as durationSeconds FROM attempts ORDER BY id DESC LIMIT 12').all().reverse();
 const byCategory = db.prepare(`SELECT category, COUNT(*) total, SUM(is_correct) correct, ROUND(100.0 * SUM(is_correct)/COUNT(*),1) accuracy FROM answers GROUP BY category`).all();
 const weak = (byCategory as any[]).filter(x => x.accuracy < 70).sort((a,b)=>a.accuracy-b.accuracy);
 const recommendations = weak.length ? weak.slice(0,2).map(x => `Focus on ${x.category}: your accuracy is ${x.accuracy}%. Try a 10-question timed drill and review explanations.`) : ['Complete a diagnostic quiz to unlock recommendations.', 'Use a timed drill to build speed and accuracy.'];
 res.json({ attempts, byCategory, recommendations });
});
const port = Number(process.env.PORT) || 4000;
const server = app.listen(port, () => console.log(`AptiPrep API running at http://localhost:${port}`));
server.on('error', (error: NodeJS.ErrnoException) => {
 if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Stop the existing server or set PORT to a different port.`);
 else console.error('Unable to start AptiPrep API:', error.message);
 process.exit(1);
});
