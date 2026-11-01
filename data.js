/* ── Persons ──────────────────────────────────────── */
const PERSONS = ['εγώ','εσύ','αυτός/η','εμείς','εσείς','αυτοί/ές'];

/* ── Verbs (alphabetical) ────────────────────────── */
const VERBS = [
  {
    greek:'βλέπω', past:'είδα', future:'θα δω',
    english:'to see', russian:'видеть',
    ex_en:'I see the sea.', ex_ru:'Я вижу море.', ex_gr:'Βλέπω τη θάλασσα.',
    conj_pres:['βλέπω','βλέπεις','βλέπει','βλέπουμε','βλέπετε','βλέπουν'],
    conj_past:['είδα','είδες','είδε','είδαμε','είδατε','είδαν'],
    conj_fut: ['θα δω','θα δεις','θα δει','θα δούμε','θα δείτε','θα δουν'],
    audio: null
  },
  {
    greek:'είμαι', past:'ήμουν', future:'θα είμαι',
    english:'to be', russian:'быть',
    ex_en:'I am a student.', ex_ru:'Я ученик.', ex_gr:'Είμαι μαθητής.',
    conj_pres:['είμαι','είσαι','είναι','είμαστε','είστε','είναι'],
    conj_past:['ήμουν','ήσουν','ήταν','ήμαστε','ήσαστε','ήταν'],
    conj_fut: ['θα είμαι','θα είσαι','θα είναι','θα είμαστε','θα είστε','θα είναι'],
    audio: null
  },
  {
    greek:'έχω', past:'είχα', future:'θα έχω',
    english:'to have', russian:'иметь',
    ex_en:'I have a cat.', ex_ru:'У меня есть кошка.', ex_gr:'Έχω μια γάτα.',
    conj_pres:['έχω','έχεις','έχει','έχουμε','έχετε','έχουν'],
    conj_past:['είχα','είχες','είχε','είχαμε','είχατε','είχαν'],
    conj_fut: ['θα έχω','θα έχεις','θα έχει','θα έχουμε','θα έχετε','θα έχουν'],
    audio: null
  },
  {
    greek:'θέλω', past:'θέλησα', future:'θα θελήσω',
    english:'to want', russian:'хотеть',
    ex_en:'I want water.', ex_ru:'Я хочу воды.', ex_gr:'Θέλω νερό.',
    conj_pres:['θέλω','θέλεις','θέλει','θέλουμε','θέλετε','θέλουν'],
    conj_past:['θέλησα','θέλησες','θέλησε','θελήσαμε','θελήσατε','θέλησαν'],
    conj_fut: ['θα θελήσω','θα θελήσεις','θα θελήσει','θα θελήσουμε','θα θελήσετε','θα θελήσουν'],
    audio: null
  },
  {
    greek:'κάνω', past:'έκανα', future:'θα κάνω',
    english:'to do', russian:'делать',
    ex_en:'I do exercise.', ex_ru:'Я занимаюсь спортом.', ex_gr:'Κάνω γυμναστική.',
    conj_pres:['κάνω','κάνεις','κάνει','κάνουμε','κάνετε','κάνουν'],
    conj_past:['έκανα','έκανες','έκανε','κάναμε','κάνατε','έκαναν'],
    conj_fut: ['θα κάνω','θα κάνεις','θα κάνει','θα κάνουμε','θα κάνετε','θα κάνουν'],
    audio: null
  },
  {
    greek:'λέω', past:'είπα', future:'θα πω',
    english:'to say', russian:'говорить',
    ex_en:'What do you say?', ex_ru:'Что ты говоришь?', ex_gr:'Τι λες;',
    conj_pres:['λέω','λες','λέει','λέμε','λέτε','λένε'],
    conj_past:['είπα','είπες','είπε','είπαμε','είπατε','είπαν'],
    conj_fut: ['θα πω','θα πεις','θα πει','θα πούμε','θα πείτε','θα πουν'],
    audio: null
  },
  {
    greek:'μπορώ', past:'μπόρεσα', future:'θα μπορέσω',
    english:'to be able', russian:'мочь',
    ex_en:'I can help.', ex_ru:'Я могу помочь.', ex_gr:'Μπορώ να βοηθήσω.',
    conj_pres:['μπορώ','μπορείς','μπορεί','μπορούμε','μπορείτε','μπορούν'],
    conj_past:['μπόρεσα','μπόρεσες','μπόρεσε','μπορέσαμε','μπορέσατε','μπόρεσαν'],
    conj_fut: ['θα μπορέσω','θα μπορέσεις','θα μπορέσει','θα μπορέσουμε','θα μπορέσετε','θα μπορέσουν'],
    audio: null
  },
  {
    greek:'πηγαίνω', past:'πήγα', future:'θα πάω',
    english:'to go', russian:'идти',
    ex_en:'I go to work.', ex_ru:'Я иду на работу.', ex_gr:'Πηγαίνω στη δουλειά.',
    conj_pres:['πηγαίνω','πηγαίνεις','πηγαίνει','πηγαίνουμε','πηγαίνετε','πηγαίνουν'],
    conj_past:['πήγα','πήγες','πήγε','πήγαμε','πήγατε','πήγαν'],
    conj_fut: ['θα πάω','θα πας','θα πάει','θα πάμε','θα πάτε','θα πάνε'],
    audio: null
  },
  {
    greek:'τρώω', past:'έφαγα', future:'θα φάω',
    english:'to eat', russian:'есть',
    ex_en:'I eat bread.', ex_ru:'Я ем хлеб.', ex_gr:'Τρώω ψωμί.',
    conj_pres:['τρώω','τρως','τρώει','τρώμε','τρώτε','τρώνε'],
    conj_past:['έφαγα','έφαγες','έφαγε','φάγαμε','φάγατε','έφαγαν'],
    conj_fut: ['θα φάω','θα φας','θα φάει','θα φάμε','θα φάτε','θα φάνε'],
    audio: null
  },
  {
    greek:'ξέρω', past:'ήξερα', future:'θα ξέρω',
    english:'to know', russian:'знать',
    ex_en:'I know Greek.', ex_ru:'Я знаю греческий.', ex_gr:'Ξέρω ελληνικά.',
    conj_pres:['ξέρω','ξέρεις','ξέρει','ξέρουμε','ξέρετε','ξέρουν'],
    conj_past:['ήξερα','ήξερες','ήξερε','ξέραμε','ξέρατε','ήξεραν'],
    conj_fut: ['θα ξέρω','θα ξέρεις','θα ξέρει','θα ξέρουμε','θα ξέρετε','θα ξέρουν'],
    audio: null
  },
];

/* ── Extended A2 dictionary (forms for εγώ) ───────── */
const EXTRA_VERBS = [
  {greek:'αγοράζω', past:'αγόρασα', future:'θα αγοράσω', english:'to buy', russian:'покупать'},
  {greek:'αλλάζω', past:'άλλαξα', future:'θα αλλάξω', english:'to change', russian:'менять'},
  {greek:'ανεβαίνω', past:'ανέβηκα', future:'θα ανεβώ', english:'to go up', russian:'подниматься'},
  {greek:'ανοίγω', past:'άνοιξα', future:'θα ανοίξω', english:'to open', russian:'открывать'},
  {greek:'αργώ', past:'άργησα', future:'θα αργήσω', english:'to be late', russian:'опаздывать'},
  {greek:'βάζω', past:'έβαλα', future:'θα βάλω', english:'to put', russian:'класть, ставить'},
  {greek:'βγάζω', past:'έβγαλα', future:'θα βγάλω', english:'to take out', russian:'вынимать, снимать'},
  {greek:'βγαίνω', past:'βγήκα', future:'θα βγω', english:'to go out', russian:'выходить'},
  {greek:'βρίσκω', past:'βρήκα', future:'θα βρω', english:'to find', russian:'находить'},
  {greek:'γίνομαι', past:'έγινα', future:'θα γίνω', english:'to become', russian:'становиться'},
  {greek:'γράφω', past:'έγραψα', future:'θα γράψω', english:'to write', russian:'писать'},
  {greek:'διαβάζω', past:'διάβασα', future:'θα διαβάσω', english:'to read', russian:'читать'},
  {greek:'δίνω', past:'έδωσα', future:'θα δώσω', english:'to give', russian:'давать'},
  {greek:'διψώ', past:'δίψασα', future:'θα διψάσω', english:'to be thirsty', russian:'хотеть пить'},
  {greek:'δουλεύω', past:'δούλεψα', future:'θα δουλέψω', english:'to work', russian:'работать'},
  {greek:'έρχομαι', past:'ήρθα', future:'θα έρθω', english:'to come', russian:'приходить'},
  {greek:'ζητάω / ζητώ', past:'ζήτησα', future:'θα ζητήσω', english:'to ask for', russian:'просить'},
  {greek:'κάθομαι', past:'κάθισα', future:'θα καθίσω', english:'to sit', russian:'сидеть, садиться'},
  {greek:'καταλαβαίνω', past:'κατάλαβα', future:'θα καταλάβω', english:'to understand', russian:'понимать'},
  {greek:'κατεβαίνω', past:'κατέβηκα', future:'θα κατεβώ', english:'to go down', russian:'спускаться'},
  {greek:'κλέβω', past:'έκλεψα', future:'θα κλέψω', english:'to steal', russian:'красть'},
  {greek:'κλείνω', past:'έκλεισα', future:'θα κλείσω', english:'to close, book', russian:'закрывать, бронировать'},
  {greek:'κολυμπάω / κολυμπώ', past:'κολύμπησα', future:'θα κολυμπήσω', english:'to swim', russian:'плавать'},
  {greek:'λείπω', past:'έλειψα', future:'θα λείψω', english:'to be absent', russian:'отсутствовать'},
  {greek:'μαθαίνω', past:'έμαθα', future:'θα μάθω', english:'to learn', russian:'учить, узнавать'},
  {greek:'μένω', past:'έμεινα', future:'θα μείνω', english:'to live, stay', russian:'жить, оставаться'},
  {greek:'μιλάω / μιλώ', past:'μίλησα', future:'θα μιλήσω', english:'to speak', russian:'разговаривать'},
  {greek:'μπαίνω', past:'μπήκα', future:'θα μπω', english:'to enter', russian:'входить'},
  {greek:'ξεχνάω / ξεχνώ', past:'ξέχασα', future:'θα ξεχάσω', english:'to forget', russian:'забывать'},
  {greek:'παίρνω', past:'πήρα', future:'θα πάρω', english:'to take', russian:'брать'},
  {greek:'παίρνω μέρος', past:'πήρα μέρος', future:'θα πάρω μέρος', english:'to take part', russian:'принимать участие'},
  {greek:'παραγγέλνω', past:'παρήγγειλα', future:'θα παραγγείλω', english:'to order', russian:'заказывать'},
  {greek:'περιμένω', past:'περίμενα', future:'θα περιμένω', english:'to wait', russian:'ждать'},
  {greek:'περνάω / περνώ', past:'πέρασα', future:'θα περάσω', english:'to pass, spend time', russian:'проходить, проводить время'},
  {greek:'πέφτω', past:'έπεσα', future:'θα πέσω', english:'to fall', russian:'падать'},
  {greek:'πίνω', past:'ήπια', future:'θα πιω', english:'to drink', russian:'пить'},
  {greek:'πλένω', past:'έπλυνα', future:'θα πλύνω', english:'to wash', russian:'мыть, стирать'},
  {greek:'πληρώνω', past:'πλήρωσα', future:'θα πληρώσω', english:'to pay', russian:'платить'},
  {greek:'πονάω / πονώ', past:'πόνεσα', future:'θα πονέσω', english:'to hurt', russian:'болеть (о части тела)'},
  {greek:'προσέχω', past:'πρόσεξα', future:'θα προσέξω', english:'to pay attention', russian:'быть внимательным'},
  {greek:'σηκώνομαι', past:'σηκώθηκα', future:'θα σηκωθώ', english:'to get up', russian:'вставать'},
  {greek:'σκέφτομαι', past:'σκέφτηκα', future:'θα σκεφτώ', english:'to think', russian:'думать'},
  {greek:'στέλνω', past:'έστειλα', future:'θα στείλω', english:'to send', russian:'отправлять'},
  {greek:'συνεχίζω', past:'συνέχισα', future:'θα συνεχίσω', english:'to continue', russian:'продолжать'},
  {greek:'ταξιδεύω', past:'ταξίδεψα', future:'θα ταξιδέψω', english:'to travel', russian:'путешествовать'},
  {greek:'τηλεφωνώ', past:'τηλεφώνησα', future:'θα τηλεφωνήσω', english:'to call', russian:'звонить'},
  {greek:'τρέχω', past:'έτρεξα', future:'θα τρέξω', english:'to run', russian:'бегать'},
  {greek:'φέρνω', past:'έφερα', future:'θα φέρω', english:'to bring', russian:'приносить'},
  {greek:'φεύγω', past:'έφυγα', future:'θα φύγω', english:'to leave', russian:'уходить, уезжать'},
  {greek:'φοράω / φορώ', past:'φόρεσα', future:'θα φορέσω', english:'to wear', russian:'носить одежду'},
  {greek:'φτάνω', past:'έφτασα', future:'θα φτάσω', english:'to arrive', russian:'прибывать'},
  {greek:'φτιάχνω', past:'έφτιαξα', future:'θα φτιάξω', english:'to make, prepare', russian:'готовить, делать'},
  {greek:'χρειάζομαι', past:'χρειάστηκα', future:'θα χρειαστώ', english:'to need', russian:'нуждаться'},
  {greek:'ψάχνω', past:'έψαξα', future:'θα ψάξω', english:'to look for', russian:'искать'},
];

const ALL_VERBS = [...VERBS, ...EXTRA_VERBS];

/* Shared metadata: grammar and real-life topics. */
const TOPICS = [
  {id:'daily', en:'Daily Routine', ru:'Повседневная жизнь'},
  {id:'food', en:'Food & Drinks', ru:'Еда и напитки'},
  {id:'home', en:'Home & Family', ru:'Дом и семья'},
  {id:'work', en:'Work & Study', ru:'Работа и учёба'},
  {id:'travel', en:'Travel & Transport', ru:'Поездки и транспорт'},
  {id:'shopping', en:'Shopping & Services', ru:'Покупки и услуги'},
  {id:'health', en:'Health & Feelings', ru:'Здоровье и самочувствие'},
  {id:'social', en:'Communication & Social Life', ru:'Общение и встречи'},
  {id:'picnic', en:'Picnic & Outdoor Activities', ru:'Пикник и отдых на природе'},
  {id:'doctor', en:'At the Doctor / Pharmacy', ru:'У врача и в аптеке'},
  {id:'hotel', en:'At a Hotel', ru:'В гостинице'},
  {id:'holiday', en:'Holidays & Leisure', ru:'Отдых и отпуск'},
  {id:'visa', en:'Visa & Immigration Office', ru:'Виза и миграционная служба'},
  {id:'lost', en:'Lost or Stolen Bag / Wallet', ru:'Потеря или кража сумки или кошелька'},
];

const B1_VERBS = new Set(['διψώ','ζητάω / ζητώ','κολυμπάω / κολυμπώ','μιλάω / μιλώ','περνάω / περνώ','πονάω / πονώ','φοράω / φορώ']);
const B2_VERBS = new Set(['αργώ','μπορώ','τηλεφωνώ']);
const OMAI_VERBS = new Set(['γίνομαι','έρχομαι','κάθομαι','σηκώνομαι','σκέφτομαι','χρειάζομαι']);
const IRREGULAR_VERBS = new Set(['ανεβαίνω','βάζω','βγάζω','βγαίνω','βλέπω','βρίσκω','γίνομαι','δίνω','είμαι','έρχομαι','έχω','κάθομαι','κάνω','καταλαβαίνω','κατεβαίνω','λέω','μαθαίνω','μένω','μπαίνω','μπορώ','ξέρω','παίρνω','παίρνω μέρος','παραγγέλνω','πέφτω','πηγαίνω','πίνω','στέλνω','τρώω','φέρνω','φεύγω','χρειάζομαι']);
const UNSUPPORTED_AORIST = new Set(['είμαι','έχω','ξέρω']);

const TOPIC_VERBS = {
  daily:['ανοίγω','αργώ','βάζω','βγαίνω','κάθομαι','κάνω','κλείνω','μένω','πηγαίνω','σηκώνομαι','τρώω','φοράω / φορώ','φτιάχνω'],
  food:['αγοράζω','βάζω','θέλω','κάνω','παραγγέλνω','πίνω','πληρώνω','τρώω','φέρνω','φτιάχνω'],
  home:['ανοίγω','βάζω','βγάζω','είμαι','έχω','κλείνω','μένω','πλένω','χρειάζομαι','φτιάχνω'],
  work:['αργώ','γράφω','διαβάζω','δίνω','δουλεύω','καταλαβαίνω','κάνω','μαθαίνω','ξέρω','στέλνω','συνεχίζω'],
  travel:['ανεβαίνω','βγαίνω','έρχομαι','κατεβαίνω','μπαίνω','παίρνω','περιμένω','πηγαίνω','ταξιδεύω','τρέχω','φεύγω','φτάνω'],
  shopping:['αγοράζω','αλλάζω','βγάζω','βρίσκω','ζητάω / ζητώ','κλείνω','παίρνω','παραγγέλνω','πληρώνω','φοράω / φορώ','χρειάζομαι','ψάχνω'],
  health:['διψώ','είμαι','θέλω','κάθομαι','μπορώ','πονάω / πονώ','σηκώνομαι','χρειάζομαι'],
  social:['βλέπω','έρχομαι','ζητάω / ζητώ','λέω','μιλάω / μιλώ','περιμένω','στέλνω','τηλεφωνώ'],
  picnic:['αγοράζω','βρίσκω','έρχομαι','θέλω','κάνω','παίρνω','πηγαίνω','πίνω','τρώω','φέρνω','φεύγω','φτιάχνω'],
  doctor:['έρχομαι','ζητάω / ζητώ','λέω','μπορώ','περιμένω','πονάω / πονώ','χρειάζομαι'],
  hotel:['ανοίγω','έρχομαι','έχω','ζητάω / ζητώ','κλείνω','μένω','πληρώνω','χρειάζομαι'],
  holiday:['βγαίνω','βλέπω','κολυμπάω / κολυμπώ','πηγαίνω','ταξιδεύω','φέρνω','φεύγω','φτάνω'],
  visa:['δίνω','έρχομαι','έχω','ζητάω / ζητώ','περιμένω','στέλνω','χρειάζομαι'],
  lost:['βγάζω','βρίσκω','έχω','κλέβω','λέω','παίρνω','τηλεφωνώ','ψάχνω'],
};

const makeVerbId = greek => greek.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'');
ALL_VERBS.forEach(v => {
  v.id = makeVerbId(v.greek);
  v.group = OMAI_VERBS.has(v.greek) ? 'omai' : B2_VERBS.has(v.greek) ? 'b2' : B1_VERBS.has(v.greek) ? 'b1' : 'a';
  v.irregular = IRREGULAR_VERBS.has(v.greek);
  v.aoristSupported = !UNSUPPORTED_AORIST.has(v.greek);
  v.topics = TOPICS.filter(topic => (TOPIC_VERBS[topic.id] || []).includes(v.greek)).map(topic => topic.id);
});

/* Complete person/number forms for the shared practice pool. */
const PRESENT_OVERRIDES = {
  'γίνομαι':['γίνομαι','γίνεσαι','γίνεται','γινόμαστε','γίνεστε','γίνονται'],
  'έρχομαι':['έρχομαι','έρχεσαι','έρχεται','ερχόμαστε','έρχεστε','έρχονται'],
  'κάθομαι':['κάθομαι','κάθεσαι','κάθεται','καθόμαστε','κάθεστε','κάθονται'],
  'σηκώνομαι':['σηκώνομαι','σηκώνεσαι','σηκώνεται','σηκωνόμαστε','σηκώνεστε','σηκώνονται'],
  'σκέφτομαι':['σκέφτομαι','σκέφτεσαι','σκέφτεται','σκεφτόμαστε','σκέφτεστε','σκέφτονται'],
  'χρειάζομαι':['χρειάζομαι','χρειάζεσαι','χρειάζεται','χρειαζόμαστε','χρειάζεστε','χρειάζονται'],
  'παίρνω μέρος':['παίρνω μέρος','παίρνεις μέρος','παίρνει μέρος','παίρνουμε μέρος','παίρνετε μέρος','παίρνουν μέρος'],
};

function regularPresent(v) {
  if (PRESENT_OVERRIDES[v.greek]) return PRESENT_OVERRIDES[v.greek];
  const base=v.greek.split(' / ')[0];
  if(v.group==='b1') {
    const stem=base.endsWith('άω')?base.slice(0,-2):base.slice(0,-1);
    return [base,stem+'άς',stem+'άει',stem+'άμε',stem+'άτε',stem+'άνε'];
  }
  if(v.group==='b2') {
    const stem=base.slice(0,-1);
    return [base,stem+'είς',stem+'εί',stem+'ούμε',stem+'είτε',stem+'ούν'];
  }
  const stem=base.endsWith('ω')?base.slice(0,-1):base;
  return [base,stem+'εις',stem+'ει',stem+'ουμε',stem+'ετε',stem+'ουν'];
}

function conjugateAorist(form) {
  if(!form)return null;
  if(form.includes(' μέρος')) {
    const first=form.replace(' μέρος','');
    return conjugateAorist(first).map(x=>x+' μέρος');
  }
  if(!form.endsWith('α'))return [form,form,form,form,form,form];
  const stem=form.slice(0,-1);
  return [form,stem+'ες',stem+'ε',stem+'αμε',stem+'ατε',stem+'αν'];
}

const FUTURE_OVERRIDES = {
  'θα δω':['θα δω','θα δεις','θα δει','θα δούμε','θα δείτε','θα δουν'],
  'θα βρω':['θα βρω','θα βρεις','θα βρει','θα βρούμε','θα βρείτε','θα βρουν'],
  'θα βγω':['θα βγω','θα βγεις','θα βγει','θα βγούμε','θα βγείτε','θα βγουν'],
  'θα μπω':['θα μπω','θα μπεις','θα μπει','θα μπούμε','θα μπείτε','θα μπουν'],
  'θα πω':['θα πω','θα πεις','θα πει','θα πούμε','θα πείτε','θα πουν'],
  'θα πιω':['θα πιω','θα πιεις','θα πιει','θα πιούμε','θα πιείτε','θα πιουν'],
  'θα πάω':['θα πάω','θα πας','θα πάει','θα πάμε','θα πάτε','θα πάνε'],
  'θα φάω':['θα φάω','θα φας','θα φάει','θα φάμε','θα φάτε','θα φάνε'],
  'θα πάρω μέρος':['θα πάρω μέρος','θα πάρεις μέρος','θα πάρει μέρος','θα πάρουμε μέρος','θα πάρετε μέρος','θα πάρουν μέρος'],
};

function conjugateFuture(form) {
  if(FUTURE_OVERRIDES[form])return FUTURE_OVERRIDES[form];
  const bare=form.replace(/^θα\s+/,'');
  if(bare.endsWith('ομαι')) {
    const fake={greek:bare,group:'omai'};
    return regularPresent(fake).map(x=>'θα '+x);
  }
  if(bare.endsWith('ώ')) {
    const stem=bare.slice(0,-1);
    return [bare,stem+'είς',stem+'εί',stem+'ούμε',stem+'είτε',stem+'ούν'].map(x=>'θα '+x);
  }
  if(bare.endsWith('ω')) {
    const stem=bare.slice(0,-1);
    return [bare,stem+'εις',stem+'ει',stem+'ουμε',stem+'ετε',stem+'ουν'].map(x=>'θα '+x);
  }
  return Array(6).fill(form);
}

ALL_VERBS.forEach(v=>{
  v.conj_pres ||= regularPresent(v);
  if(v.aoristSupported) v.conj_past ||= conjugateAorist(v.past);
  v.conj_fut ||= conjugateFuture(v.future);
});

/* ── Fill-in-blank exercises ─────────────────────── */
const FILL_BLANKS = [
  { sen_en:'I ___ at home.',           sen_ru:'Я ___ дома.',               answer:'είμαι',    hint_en:'to be (I)',      hint_ru:'быть (я)' },
  { sen_en:'I ___ water.',             sen_ru:'Я ___ воды.',               answer:'θέλω',     hint_en:'to want (I)',    hint_ru:'хотеть (я)' },
  { sen_en:'I don\'t ___ Greek well.', sen_ru:'Я плохо ___ по-гречески.',  answer:'ξέρω',     hint_en:'to know (I)',    hint_ru:'знать (я)' },
  { sen_en:'Every day I ___ to work.', sen_ru:'Каждый день я ___ на работу.', answer:'πηγαίνω', hint_en:'to go (I)',   hint_ru:'идти (я)' },
  { sen_en:'I ___ bread every morning.',sen_ru:'Я ___ хлеб каждое утро.', answer:'τρώω',     hint_en:'to eat (I)',     hint_ru:'есть (я)' },
  { sen_en:'Do you ___ books?',        sen_ru:'У тебя ___ книги?',         answer:'έχεις',    hint_en:'to have (you)', hint_ru:'иметь (ты)' },
  { sen_en:'She ___ the sea.',         sen_ru:'Она ___ море.',             answer:'βλέπει',   hint_en:'to see (she)',   hint_ru:'видеть (она)' },
  { sen_en:'We ___ homework.',         sen_ru:'Мы ___ домашнее задание.',  answer:'κάνουμε',  hint_en:'to do (we)',     hint_ru:'делать (мы)' },
  { sen_en:'They ___ to help.',        sen_ru:'Они ___ помочь.',           answer:'μπορούν',  hint_en:'can (they)',     hint_ru:'мочь (они)' },
  { sen_en:'Yesterday I ___ to school.',sen_ru:'Вчера я ___ в школу.',    answer:'πήγα',     hint_en:'to go (I, past)',hint_ru:'идти (я, прошлое)' },
];

/* ── Sentence practice ───────────────────────────── */
const SENTENCES = [
  { en:'I see the sea.',     ru:'Я вижу море.',             opts:['βλέπω','τρώω','κάνω','ξέρω'],        answer:'βλέπω' },
  { en:'He wants water.',    ru:'Он хочет воды.',           opts:['έχει','θέλει','κάνει','βλέπει'],     answer:'θέλει' },
  { en:'We go to school.',   ru:'Мы идём в школу.',         opts:['βλέπουμε','πηγαίνουμε','τρώμε','ξέρουμε'], answer:'πηγαίνουμε' },
  { en:'Do you know Greek?', ru:'Ты знаешь греческий?',     opts:['μπορείς','ξέρεις','θέλεις','λες'],   answer:'ξέρεις' },
  { en:'I do homework.',     ru:'Я делаю домашнее задание.',opts:['λέω','κάνω','τρώω','έχω'],           answer:'κάνω' },
  { en:'She eats bread.',    ru:'Она ест хлеб.',            opts:['τρώει','βλέπει','κάνει','ξέρει'],    answer:'τρώει' },
  { en:'We can help.',       ru:'Мы можем помочь.',         opts:['ξέρουμε','θέλουμε','μπορούμε','έχουμε'], answer:'μπορούμε' },
  { en:'They have a car.',   ru:'У них есть машина.',       opts:['θέλουν','κάνουν','έχουν','λένε'],    answer:'έχουν' },
];

/* ── Change-the-tense exercises ──────────────────── */
const CHANGE_TENSES = [
  { dir_en:'Present → Past (aorist)', dir_ru:'Настоящее → Прошедшее (аорист)', form:'βλέπω',   opts:['έβλεπα','είδα','θα δω','βλέπεις'],       answer:'είδα' },
  { dir_en:'Present → Simple future', dir_ru:'Настоящее → Простое будущее', form:'τρώω', opts:['θα φάω','φάγαμε','έφαγα','τρως'], answer:'θα φάω' },
  { dir_en:'Present → Past (aorist)', dir_ru:'Настоящее → Прошедшее (аорист)', form:'πηγαίνω', opts:['θα πάω','πηγαίνεις','πήγα','πηγαίνει'], answer:'πήγα' },
  { dir_en:'Present → Simple future', dir_ru:'Настоящее → Простое будущее', form:'κάνω', opts:['θα κάνω','έκανα','κάνεις','κάναμε'], answer:'θα κάνω' },
  { dir_en:'Present → Past (aorist)', dir_ru:'Настоящее → Прошедшее (аорист)', form:'λέω', opts:['θα πω','λένε','είπα','λέει'], answer:'είπα' },
  { dir_en:'Present → Simple future', dir_ru:'Настоящее → Простое будущее', form:'ξέρω', opts:['ήξερα','θα ξέρω','ξέρεις','ξέραμε'], answer:'θα ξέρω' },
  { dir_en:'Present → Simple future', dir_ru:'Настоящее → Простое будущее', form:'έχω', opts:['θα έχω','έχεις','είχα','είχαμε'], answer:'θα έχω' },
  { dir_en:'Present → Simple future', dir_ru:'Настоящее → Простое будущее', form:'είμαι', opts:['θα είμαι','ήμουν','είσαι','είμαστε'], answer:'θα είμαι' },
  { dir_en:'Present → Simple future', dir_ru:'Настоящее → Простое будущее', form:'θέλω', opts:['θέλησα','θέλεις','θα θελήσω','θέλουμε'], answer:'θα θελήσω' },
];

/* ── Image exercises (emoji placeholders) ────────── */
// Replace `emoji` with an actual <img src="..."> path later
const IMAGE_EXERCISES = [
  { emoji:'👁️', label_en:'seeing the sea',  label_ru:'видеть море',          sentence:'Βλέπω τη θάλασσα.', answer:'βλέπω' },
  { emoji:'🍞', label_en:'eating bread',    label_ru:'есть хлеб',             sentence:'Τρώω ψωμί.',        answer:'τρώω' },
  { emoji:'🚶', label_en:'going to work',   label_ru:'идти на работу',        sentence:'Πηγαίνω στη δουλειά.', answer:'πηγαίνω' },
  { emoji:'💪', label_en:'doing exercise',  label_ru:'делать гимнастику',     sentence:'Κάνω γυμναστική.', answer:'κάνω' },
  { emoji:'💬', label_en:'saying the truth',label_ru:'говорить правду',       sentence:'Λέω την αλήθεια.', answer:'λέω' },
];

/* ── Picture situations with short dialogues ─────── */
const SITUATIONS = [
  {cat:'food', image:'assets/phrases/topics/food.png', answer:'παραγγείλω',
   lines:['— Καλησπέρα. Τι θα θέλατε;','— Θα ήθελα να ___ ένα ψάρι, παρακαλώ.','— Βεβαίως.'],
   full:['— Καλησπέρα. Τι θα θέλατε;','— Θα ήθελα να παραγγείλω ένα ψάρι, παρακαλώ.','— Βεβαίως.'],
   en:'At a restaurant',ru:'В ресторане'},
  {cat:'travel', image:'assets/phrases/topics/travel.png', answer:'στάση',
   lines:['— Συγγνώμη, πού είναι η ___ του λεωφορείου;','— Είναι απέναντι, δίπλα στο φαρμακείο.','— Ευχαριστώ πολύ!'],
   full:['— Συγγνώμη, πού είναι η στάση του λεωφορείου;','— Είναι απέναντι, δίπλα στο φαρμακείο.','— Ευχαριστώ πολύ!'],
   en:'Asking for directions',ru:'Как спросить дорогу'},
  {cat:'shopping', image:'assets/phrases/topics/shopping.png', answer:'κάρτα',
   lines:['— Πόσο κάνει αυτό;','— Κάνει είκοσι ευρώ.','— Μπορώ να πληρώσω με ___;'],
   full:['— Πόσο κάνει αυτό;','— Κάνει είκοσι ευρώ.','— Μπορώ να πληρώσω με κάρτα;'],
   en:'Paying in a shop',ru:'Оплата в магазине'},
  {cat:'doctor', image:'assets/phrases/topics/doctor.png', answer:'πονάει',
   lines:['— Τι πρόβλημα έχετε;','— Με ___ ο λαιμός μου από χτες.','— Θα σας εξετάσω.'],
   full:['— Τι πρόβλημα έχετε;','— Με πονάει ο λαιμός μου από χτες.','— Θα σας εξετάσω.'],
   en:'At the doctor',ru:'У врача'},
  {cat:'hotel', image:'assets/phrases/topics/hotel.png', answer:'κράτηση',
   lines:['— Καλησπέρα σας.','— Έχω κάνει ___ στο όνομα Ιβάνοβα.','— Μάλιστα, ένα λεπτό.'],
   full:['— Καλησπέρα σας.','— Έχω κάνει κράτηση στο όνομα Ιβάνοβα.','— Μάλιστα, ένα λεπτό.'],
   en:'At a hotel reception',ru:'На стойке отеля'},
  {cat:'lost', image:'assets/phrases/topics/lost.png', answer:'τσάντα',
   lines:['— Πώς μπορώ να σας βοηθήσω;','— Έχασα την ___ μου στο λεωφορείο.','— Τι χρώμα είναι;'],
   full:['— Πώς μπορώ να σας βοηθήσω;','— Έχασα την τσάντα μου στο λεωφορείο.','— Τι χρώμα είναι;'],
   en:'Reporting a lost bag',ru:'Потерянная сумка'},
  {cat:'work', image:'assets/phrases/topics/work.png', answer:'εξηγήσετε',
   lines:['— Δεν καταλαβαίνω αυτή την άσκηση.','— Μπορείτε να μου την ___;','— Φυσικά.'],
   full:['— Δεν καταλαβαίνω αυτή την άσκηση.','— Μπορείτε να μου την εξηγήσετε;','— Φυσικά.'],
   en:'Studying Greek',ru:'На занятии'},
  {cat:'social', image:'assets/phrases/topics/social.png', answer:'καφέ',
   lines:['— Τι θα κάνεις το απόγευμα;','— Δεν έχω σχέδια.','— Θέλεις να πάμε για ___;'],
   full:['— Τι θα κάνεις το απόγευμα;','— Δεν έχω σχέδια.','— Θέλεις να πάμε για καφέ;'],
   en:'Making plans with friends',ru:'Планы с друзьями'},
];

/* ── Everyday Modern Greek for A2 exam prep ─────── */
const EXAM_PHRASES = [
  {cat:'greetings', gr:'Γεια σας! Τι κάνετε;', en:'Hello! How are you?', ru:'Здравствуйте! Как вы?'},
  {cat:'greetings', gr:'Χάρηκα πολύ.', en:'Nice to meet you.', ru:'Очень приятно.'},
  {cat:'greetings', gr:'Καλημέρα σας.', en:'Good morning.', ru:'Доброе утро.'},
  {cat:'greetings', gr:'Ευχαριστώ πολύ.', en:'Thank you very much.', ru:'Большое спасибо.'},
  {cat:'greetings', gr:'Παρακαλώ, δεν κάνει τίποτα.', en:"You're welcome, no problem.", ru:'Пожалуйста, ничего страшного.'},

  {cat:'personal', gr:'Με λένε Άννα.', en:'My name is Anna.', ru:'Меня зовут Анна.'},
  {cat:'personal', gr:'Είμαι από τη Ρωσία και μένω στην Κύπρο.', en:'I am from Russia and I live in Cyprus.', ru:'Я из России и живу на Кипре.'},
  {cat:'personal', gr:'Είμαι παντρεμένος / παντρεμένη.', en:'I am married.', ru:'Я женат / замужем.'},
  {cat:'personal', gr:'Στον ελεύθερο χρόνο μου διαβάζω και περπατάω.', en:'In my free time I read and walk.', ru:'В свободное время я читаю и гуляю.'},
  {cat:'personal', gr:'Μαθαίνω ελληνικά εδώ και έναν χρόνο.', en:'I have been learning Greek for a year.', ru:'Я учу греческий уже год.'},

  {cat:'daily', gr:'Κάθε μέρα ξυπνάω στις επτά.', en:'Every day I wake up at seven.', ru:'Каждый день я просыпаюсь в семь.'},
  {cat:'daily', gr:'Μετά τη δουλειά πηγαίνω στο σπίτι.', en:'After work I go home.', ru:'После работы я иду домой.'},
  {cat:'daily', gr:'Το Σαββατοκύριακο ξεκουράζομαι.', en:'At the weekend I rest.', ru:'На выходных я отдыхаю.'},
  {cat:'daily', gr:'Συνήθως πηγαίνω με το λεωφορείο.', en:'I usually go by bus.', ru:'Обычно я езжу на автобусе.'},
  {cat:'daily', gr:'Το πρωί φτιάχνω καφέ και τρώω πρωινό.', en:'In the morning I make coffee and eat breakfast.', ru:'Утром я готовлю кофе и завтракаю.'},
  {cat:'daily', gr:'Φεύγω από το σπίτι στις οκτώ.', en:'I leave home at eight.', ru:'Я выхожу из дома в восемь.'},
  {cat:'daily', gr:'Στο διάλειμμα μιλάω με τους συναδέλφους μου.', en:'During the break I talk with my colleagues.', ru:'На перерыве я разговариваю с коллегами.'},
  {cat:'daily', gr:'Το απόγευμα ψωνίζω στο σούπερ μάρκετ.', en:'In the afternoon I shop at the supermarket.', ru:'Днём я делаю покупки в супермаркете.'},
  {cat:'daily', gr:'Όταν γυρίζω σπίτι, μαγειρεύω το βραδινό.', en:'When I return home, I cook dinner.', ru:'Когда я возвращаюсь домой, я готовлю ужин.'},
  {cat:'daily', gr:'Μετά το φαγητό πλένω τα πιάτα.', en:'After the meal I wash the dishes.', ru:'После еды я мою посуду.'},
  {cat:'daily', gr:'Το βράδυ βλέπω τηλεόραση ή διαβάζω.', en:'In the evening I watch television or read.', ru:'Вечером я смотрю телевизор или читаю.'},
  {cat:'daily', gr:'Πριν κοιμηθώ, ετοιμάζω τα πράγματά μου.', en:'Before sleeping, I prepare my things.', ru:'Перед сном я готовлю свои вещи.'},
  {cat:'daily', gr:'Την Παρασκευή συναντώ τους φίλους μου.', en:'On Friday I meet my friends.', ru:'В пятницу я встречаюсь с друзьями.'},
  {cat:'daily', gr:'Την Κυριακή καθαρίζω το σπίτι και ξεκουράζομαι.', en:'On Sunday I clean the house and rest.', ru:'В воскресенье я убираю дом и отдыхаю.'},

  {cat:'directions', gr:'Συγγνώμη, πού είναι η στάση;', en:'Excuse me, where is the bus stop?', ru:'Извините, где автобусная остановка?'},
  {cat:'directions', gr:'Πώς μπορώ να πάω στο κέντρο;', en:'How can I get to the centre?', ru:'Как мне добраться до центра?'},
  {cat:'directions', gr:'Πηγαίνετε ευθεία και στρίψτε δεξιά.', en:'Go straight and turn right.', ru:'Идите прямо и поверните направо.'},
  {cat:'directions', gr:'Είναι μακριά από εδώ;', en:'Is it far from here?', ru:'Это далеко отсюда?'},

  {cat:'shopping', gr:'Πόσο κάνει αυτό;', en:'How much is this?', ru:'Сколько это стоит?'},
  {cat:'shopping', gr:'Θα ήθελα ένα κιλό μήλα.', en:'I would like one kilo of apples.', ru:'Я бы хотел(а) килограмм яблок.'},
  {cat:'shopping', gr:'Έχετε κάτι πιο φθηνό;', en:'Do you have something cheaper?', ru:'У вас есть что-нибудь дешевле?'},
  {cat:'shopping', gr:'Μπορώ να πληρώσω με κάρτα;', en:'Can I pay by card?', ru:'Можно оплатить картой?'},
  {cat:'shopping', gr:'Μπορώ να το δοκιμάσω;', en:'Can I try it on?', ru:'Можно это примерить?'},

  {cat:'food', gr:'Θα ήθελα να παραγγείλω.', en:'I would like to order.', ru:'Я хотел(а) бы сделать заказ.'},
  {cat:'food', gr:'Τι μου προτείνετε;', en:'What do you recommend?', ru:'Что вы мне посоветуете?'},
  {cat:'food', gr:'Χωρίς κρεμμύδι, παρακαλώ.', en:'Without onion, please.', ru:'Без лука, пожалуйста.'},
  {cat:'food', gr:'Τον λογαριασμό, παρακαλώ.', en:'The bill, please.', ru:'Счёт, пожалуйста.'},
  {cat:'food', gr:'Ήταν πολύ νόστιμο.', en:'It was very tasty.', ru:'Было очень вкусно.'},

  {cat:'health', gr:'Δεν αισθάνομαι καλά.', en:"I don't feel well.", ru:'Я плохо себя чувствую.'},
  {cat:'health', gr:'Πονάει το κεφάλι μου.', en:'My head hurts.', ru:'У меня болит голова.'},
  {cat:'health', gr:'Χρειάζομαι έναν γιατρό.', en:'I need a doctor.', ru:'Мне нужен врач.'},
  {cat:'health', gr:'Πού είναι το φαρμακείο;', en:'Where is the pharmacy?', ru:'Где находится аптека?'},

  {cat:'plans', gr:'Τι θα κάνεις αύριο;', en:'What will you do tomorrow?', ru:'Что ты будешь делать завтра?'},
  {cat:'plans', gr:'Θέλεις να πάμε για καφέ;', en:'Would you like to go for coffee?', ru:'Хочешь пойти выпить кофе?'},
  {cat:'plans', gr:'Τι ώρα σε βολεύει;', en:'What time suits you?', ru:'В какое время тебе удобно?'},
  {cat:'plans', gr:'Λυπάμαι, δεν μπορώ σήμερα.', en:"I'm sorry, I can't today.", ru:'Извини, сегодня я не могу.'},

  {cat:'opinion', gr:'Κατά τη γνώμη μου, είναι καλή ιδέα.', en:'In my opinion, it is a good idea.', ru:'По моему мнению, это хорошая идея.'},
  {cat:'opinion', gr:'Συμφωνώ μαζί σου.', en:'I agree with you.', ru:'Я с тобой согласен / согласна.'},
  {cat:'opinion', gr:'Δεν συμφωνώ, γιατί είναι ακριβό.', en:"I don't agree because it is expensive.", ru:'Я не согласен / не согласна, потому что это дорого.'},
  {cat:'opinion', gr:'Μου αρέσει περισσότερο αυτή η επιλογή.', en:'I like this option more.', ru:'Мне больше нравится этот вариант.'},

  {cat:'work', gr:'Δουλεύω από τις οκτώ μέχρι τις τέσσερις.', en:'I work from eight until four.', ru:'Я работаю с восьми до четырёх.'},
  {cat:'work', gr:'Σπουδάζω ελληνικά για την εξέταση.', en:'I study Greek for the exam.', ru:'Я изучаю греческий для экзамена.'},
  {cat:'work', gr:'Μπορείτε να μου εξηγήσετε αυτή την άσκηση;', en:'Can you explain this exercise to me?', ru:'Вы можете объяснить мне это упражнение?'},
  {cat:'work', gr:'Έστειλα το μήνυμα στον καθηγητή.', en:'I sent the message to the teacher.', ru:'Я отправил(а) сообщение преподавателю.'},

  {cat:'picnic', gr:'Θέλεις να πάμε για πικνίκ την Κυριακή;', en:'Would you like to go for a picnic on Sunday?', ru:'Хочешь пойти на пикник в воскресенье?'},
  {cat:'picnic', gr:'Εγώ θα φέρω νερό και χυμό.', en:'I will bring water and juice.', ru:'Я принесу воду и сок.'},
  {cat:'picnic', gr:'Βρήκαμε ένα ωραίο μέρος κοντά στη θάλασσα.', en:'We found a nice place near the sea.', ru:'Мы нашли хорошее место рядом с морем.'},
  {cat:'picnic', gr:'Μην ξεχάσετε να πάρετε καπέλο.', en:"Don't forget to take a hat.", ru:'Не забудьте взять шляпу.'},
  {cat:'picnic', gr:'Πριν φύγουμε, θα μαζέψουμε όλα τα σκουπίδια.', en:'Before we leave, we will collect all the rubbish.', ru:'Перед уходом мы соберём весь мусор.'},

  {cat:'doctor', gr:'Θα ήθελα να κλείσω ραντεβού με τον γιατρό.', en:'I would like to make an appointment with the doctor.', ru:'Я хотел(а) бы записаться к врачу.'},
  {cat:'doctor', gr:'Έχω πυρετό και πονάει ο λαιμός μου.', en:'I have a fever and my throat hurts.', ru:'У меня температура и болит горло.'},
  {cat:'doctor', gr:'Πονάω εδώ από χτες το βράδυ.', en:'It has hurt here since last night.', ru:'У меня болит здесь со вчерашнего вечера.'},
  {cat:'doctor', gr:'Πόσες φορές την ημέρα να παίρνω το φάρμακο;', en:'How many times a day should I take the medicine?', ru:'Сколько раз в день принимать лекарство?'},
  {cat:'doctor', gr:'Χρειάζομαι κάτι για τον βήχα.', en:'I need something for a cough.', ru:'Мне нужно что-нибудь от кашля.'},
  {cat:'doctor', gr:'Έχω αλλεργία στην πενικιλίνη.', en:'I am allergic to penicillin.', ru:'У меня аллергия на пенициллин.'},

  {cat:'hotel', gr:'Έχω κάνει κράτηση στο όνομα Ιβάνοβα.', en:'I have a reservation under the name Ivanova.', ru:'У меня бронь на имя Иванова.'},
  {cat:'hotel', gr:'Τι ώρα σερβίρεται το πρωινό;', en:'What time is breakfast served?', ru:'В какое время подают завтрак?'},
  {cat:'hotel', gr:'Δεν λειτουργεί το κλιματιστικό στο δωμάτιο.', en:"The air conditioning in the room doesn't work.", ru:'В номере не работает кондиционер.'},
  {cat:'hotel', gr:'Μπορείτε να μου φέρετε καθαρές πετσέτες;', en:'Can you bring me clean towels?', ru:'Можете принести мне чистые полотенца?'},
  {cat:'hotel', gr:'Θα ήθελα να πληρώσω τον λογαριασμό.', en:'I would like to pay the bill.', ru:'Я хотел(а) бы оплатить счёт.'},

  {cat:'holiday', gr:'Πέρσι πήγαμε διακοπές στην Κρήτη.', en:'Last year we went on holiday to Crete.', ru:'В прошлом году мы ездили в отпуск на Крит.'},
  {cat:'holiday', gr:'Αύριο θα επισκεφτούμε το μουσείο.', en:'Tomorrow we will visit the museum.', ru:'Завтра мы посетим музей.'},
  {cat:'holiday', gr:'Το απόγευμα θα πάμε στην παραλία.', en:'In the afternoon we will go to the beach.', ru:'Днём мы пойдём на пляж.'},
  {cat:'holiday', gr:'Θέλω να ξεκουραστώ και να κολυμπήσω.', en:'I want to rest and swim.', ru:'Я хочу отдохнуть и поплавать.'},

  {cat:'visa', gr:'Θα ήθελα να κλείσω ραντεβού για την άδεια παραμονής.', en:'I would like to make an appointment for my residence permit.', ru:'Я хотел(а) бы записаться на приём по поводу вида на жительство.'},
  {cat:'visa', gr:'Ποια δικαιολογητικά χρειάζονται;', en:'Which supporting documents are required?', ru:'Какие документы необходимы?'},
  {cat:'visa', gr:'Ήρθα για να καταθέσω τα έγγραφά μου.', en:'I came to submit my documents.', ru:'Я пришёл / пришла подать документы.'},
  {cat:'visa', gr:'Ο σκοπός της επίσκεψής μου είναι η εργασία.', en:'The purpose of my visit is work.', ru:'Цель моего визита — работа.'},
  {cat:'visa', gr:'Μπορείτε να ελέγξετε την κατάσταση της αίτησής μου;', en:'Can you check the status of my application?', ru:'Можете проверить статус моего заявления?'},
  {cat:'visa', gr:'Πότε πρέπει να επιστρέψω;', en:'When should I return?', ru:'Когда мне нужно прийти снова?'},

  {cat:'lost', gr:'Έχασα την τσάντα μου στο λεωφορείο.', en:'I lost my bag on the bus.', ru:'Я потерял(а) сумку в автобусе.'},
  {cat:'lost', gr:'Μου έκλεψαν το πορτοφόλι πριν από μία ώρα.', en:'My wallet was stolen an hour ago.', ru:'У меня украли кошелёк час назад.'},
  {cat:'lost', gr:'Η τσάντα είναι μαύρη και έχει δύο τσέπες.', en:'The bag is black and has two pockets.', ru:'Сумка чёрная, у неё два кармана.'},
  {cat:'lost', gr:'Μέσα ήταν η ταυτότητα και οι τραπεζικές μου κάρτες.', en:'My ID and bank cards were inside.', ru:'Внутри были удостоверение личности и банковские карты.'},
  {cat:'lost', gr:'Θέλω να δηλώσω την κλοπή στην αστυνομία.', en:'I want to report the theft to the police.', ru:'Я хочу заявить о краже в полицию.'},
  {cat:'lost', gr:'Μπορείτε να με βοηθήσετε να ακυρώσω τις κάρτες;', en:'Can you help me cancel the cards?', ru:'Можете помочь мне заблокировать карты?'},
];

/* ── i18n strings ────────────────────────────────── */
const I18N = {
  en: {
    page_title:'Greek Verbs', document_title:'Greek Verbs A2 — Trainer',
    subtitle:'{count} A2 verbs · present, past (aorist), simple future',
    nav_verbs:'📖 Verbs', nav_flash:'🃏 Flashcards', nav_practice:'🎯 Practice', nav_phrases:'💬 Phrases',
    lang_toggle:'RU', accent_label:'Train accents (τόνος)',
    accent_tip:'To type accents: press ; then a vowel (e.g. ;α → ά)',
    tbl_present:'Present', tbl_past:'Past (aorist)', tbl_future:'Simple future', tbl_trans:'Translation', tbl_audio:'🔊',
    all_verbs:'All Verbs',
    fc_front_label:'Greek · Present tense', fc_hint:'click to reveal', fc_back_label:'Translation', fc_show:'Show answer', fc_next:'Next →',
    fc_shuffle:'🔀 Shuffle', fc_pres:'Pres.:', fc_past:'Past (aor.):', fc_fut:'Fut.:',
    fc_audio:'🔊 Listen to Greek',
    sub_quiz:'Translation', sub_match:'Matching', sub_tense:'Tense ID',
    sub_conj:'Conjugation', sub_fill:'Missing letters', sub_change:'Change Tense', sub_image:'Images', sub_situation:'Situations',
    sub_person:'Person & Number', mixed_practice:'Mixed practice',
    listen:'Listen', back_to_verbs:'← Back to verbs', listen_row:'Listen to this row',
    q_gr_to_lang:'What does this mean?', q_lang_to_gr:'Choose the Greek verb:',
    dir_gr_lang:'🔁 Switch: target → Greek', dir_lang_gr:'🔁 Switch: Greek → target',
    q_tense:'What tense is this?', q_conj:'Conjugate the verb:',
    q_fill:'Type only the missing letters:', q_change:'Convert to the indicated tense:',
    situation_prompt:'Complete the dialogue', situation_listen:'🔊 Listen to the dialogue', situation_context:'Situation:',
    q_image:'Match the image to the correct Greek sentence:',
    match_col_l:'Greek', match_col_r:'Translation',
    match_info:'Click a verb on the left, then its translation on the right.',
    match_all:'🎉 All matched!', match_restart:'🔄 New game',
    pres_t:'Present', past_t:'Past (aorist)', fut_t:'Simple future',
    correct:'✓ Correct!', wrong:'✗ Wrong.', almost:'⚡ Almost! Correct:', ans_correct:'Correct answer:',
    next:'Next →', restart:'Try again 🔄', check:'Check', hint:'Hint:',
    score_lbl:'Score:', of:'of',
    result_excellent:'Excellent!', result_very_good:'Very good!', result_not_bad:'Not bad!', result_keep_going:'Keep practising!',
    phrases_title:'Everyday Greek for the A2 exam', phrases_intro:'Useful phrases for speaking and everyday situations.',
    phrases_pick:'Choose a topic:', phrases_greek:'Greek', phrases_meaning:'Meaning', phrases_context:'Situation',
    phrase_cat_greetings:'Greetings', phrase_cat_personal:'About yourself', phrase_cat_daily:'Daily routine', phrase_cat_directions:'Directions',
    phrase_cat_shopping:'Shopping', phrase_cat_food:'Café & restaurant', phrase_cat_health:'Health', phrase_cat_plans:'Plans & invitations', phrase_cat_opinion:'Opinion',
    audio_soon:'🔊 Pronunciation',
    search_verbs:'Search Greek or translation…', filter_all:'All verbs', group_a:'Α΄ conjugation', group_b1:'Β΄ conjugation — Type 1', group_b2:'Β΄ conjugation — Type 2', group_omai:'Verbs in -ομαι', group_irregular:'Irregular verbs',
    topic_all:'All topics', difficult_only:'Difficult cards', mark_difficult:'Mark as difficult', unmark_difficult:'Remove from difficult',
    practice_setup:'Practice setup', select_topic:'Topic', select_tense:'Tense', select_exercise:'Exercise', start_practice:'Start practice', my_mistakes:'My mistakes', mixed:'Mixed', empty_practice:'Not enough validated material for this selection. Try another topic or tense.',
    progress_title:'Progress', sessions:'sessions', accuracy:'accuracy', mistakes:'difficult verbs', correct_answers:'correct answers', streak_days:'day streak', missed_days:'missed days', progress_rule:'One session = 10 checked answers. Missed days are counted from your first day of practice.', close:'Close', examples:'Examples', grammar_group:'Grammar group', irregular_label:'Irregular', aorist_unavailable:'No distinct aorist is taught for this verb; the common past form shown separately is imperfect.',
  },
  ru: {
    page_title:'Греческие глаголы', document_title:'Греческие глаголы A2 — Тренажёр',
    subtitle:'{count} глагола A2 · настоящее, прошедшее (аорист), простое будущее',
    nav_verbs:'📖 Глаголы', nav_flash:'🃏 Карточки', nav_practice:'🎯 Практика', nav_phrases:'💬 Фразы',
    lang_toggle:'EN', accent_label:'Тренировать ударения (τόνος)',
    accent_tip:'Для ввода ударений: нажмите Ж (или ;), затем гласную',
    tbl_present:'Настоящее', tbl_past:'Прошедшее (аорист)', tbl_future:'Простое будущее', tbl_trans:'Перевод', tbl_audio:'🔊',
    all_verbs:'Все глаголы',
    fc_front_label:'Греческий · Настоящее время', fc_hint:'нажмите, чтобы открыть', fc_back_label:'Перевод', fc_show:'Показать ответ', fc_next:'Следующая →',
    fc_shuffle:'🔀 Перемешать', fc_pres:'Наст.:', fc_past:'Прош. (аор.):', fc_fut:'Буд.:',
    fc_audio:'🔊 Слушать по-гречески',
    sub_quiz:'Перевод', sub_match:'Совпадение', sub_tense:'Время',
    sub_conj:'Спряжение', sub_fill:'Пропущенные буквы', sub_change:'Изменить время', sub_image:'Картинки', sub_situation:'Ситуации',
    sub_person:'Лицо и число', mixed_practice:'Смешанная практика',
    listen:'Послушать', back_to_verbs:'← Назад к глаголам', listen_row:'Послушать эту строку',
    q_gr_to_lang:'Что значит это слово?', q_lang_to_gr:'Выберите греческий глагол:',
    dir_gr_lang:'🔁 Переключить: перевод → греческий', dir_lang_gr:'🔁 Переключить: греческий → перевод',
    q_tense:'Какое это время?', q_conj:'Проспрягайте глагол:',
    q_fill:'Введите только пропущенные буквы:', q_change:'Измените на указанное время:',
    situation_prompt:'Дополните диалог', situation_listen:'🔊 Послушать диалог', situation_context:'Ситуация:',
    q_image:'Найдите греческое предложение для картинки:',
    match_col_l:'Греческий', match_col_r:'Перевод',
    match_info:'Выберите глагол слева, затем перевод справа.',
    match_all:'🎉 Все пары найдены!', match_restart:'🔄 Новая игра',
    pres_t:'Настоящее', past_t:'Прошедшее (аорист)', fut_t:'Простое будущее',
    correct:'✓ Верно!', wrong:'✗ Неверно.', almost:'⚡ Почти! Правильно:', ans_correct:'Правильный ответ:',
    next:'Следующий →', restart:'Попробовать ещё раз 🔄', check:'Проверить', hint:'Подсказка:',
    score_lbl:'Счёт:', of:'из',
    result_excellent:'Отлично!', result_very_good:'Очень хорошо!', result_not_bad:'Неплохо!', result_keep_going:'Продолжайте тренироваться!',
    phrases_title:'Бытовой греческий для экзамена A2', phrases_intro:'Полезные фразы для устной части и повседневных ситуаций.',
    phrases_pick:'Выберите тему:', phrases_greek:'По-гречески', phrases_meaning:'Перевод', phrases_context:'Ситуация',
    phrase_cat_greetings:'Знакомство и вежливость', phrase_cat_personal:'О себе', phrase_cat_daily:'Распорядок дня', phrase_cat_directions:'Город и дорога',
    phrase_cat_shopping:'Покупки', phrase_cat_food:'Кафе и ресторан', phrase_cat_health:'Здоровье', phrase_cat_plans:'Планы и приглашения', phrase_cat_opinion:'Мнение',
    audio_soon:'🔊 Произношение',
    search_verbs:'Поиск по-гречески или по переводу…', filter_all:'Все глаголы', group_a:'Α΄ спряжение', group_b1:'Β΄ спряжение — тип 1', group_b2:'Β΄ спряжение — тип 2', group_omai:'Глаголы на -ομαι', group_irregular:'Неправильные глаголы',
    topic_all:'Все темы', difficult_only:'Трудные карточки', mark_difficult:'Отметить как трудную', unmark_difficult:'Убрать из трудных',
    practice_setup:'Настройка практики', select_topic:'Тема', select_tense:'Время', select_exercise:'Упражнение', start_practice:'Начать', my_mistakes:'Мои ошибки', mixed:'Смешанная практика', empty_practice:'Для этого выбора пока недостаточно проверенного материала. Выберите другую тему или время.',
    progress_title:'Прогресс', sessions:'сессий', accuracy:'точность', mistakes:'трудных глаголов', correct_answers:'верных ответов', streak_days:'дней подряд', missed_days:'пропущено дней', progress_rule:'Одна сессия = 10 проверенных ответов. Пропущенные дни считаются с первого дня занятий.', close:'Закрыть', examples:'Примеры', grammar_group:'Группа', irregular_label:'Неправильный', aorist_unavailable:'Для этого глагола отдельный аорист не изучается; распространённая прошедшая форма относится к имперфекту.',
  }
};
