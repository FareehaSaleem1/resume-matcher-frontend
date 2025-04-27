import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const firebaseConfig = {
  apiKey: "AIzaSyAPxnprfN4obgBIHn_xd31mRfECY6JHVvk",
  authDomain: "resume-matcher789.firebaseapp.com",
  projectId: "resume-matcher789",
  storageBucket: "resume-matcher789.appspot.com",
  messagingSenderId: "881631941043",
  appId: "1:881631941043:web:15cd3ed9be480fcf723bc6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function ResumeMatcher() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savedResumes, setSavedResumes] = useState([]);
  const [tagChart, setTagChart] = useState([]);
  const [scoreChart, setScoreChart] = useState([]);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) await fetchJobs(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: fullName });
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const fetchJobs = async (uid) => {
    const q = query(collection(db, 'jobs'), where('userId', '==', uid));
    const snapshot = await getDocs(q);
    const jobList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setJobs(jobList);
  };

  const fetchTaggedResumes = async (jobId) => {
    const q = query(collection(db, 'resumes'), where('userId', '==', user.uid), where('jobId', '==', jobId));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSavedResumes(list);
    setTagChart(Object.entries(list.reduce((acc, curr) => {
      acc[curr.tag] = (acc[curr.tag] || 0) + 1;
      return acc;
    }, {})).map(([name, count]) => ({ name, count })));
    setScoreChart(list.map(r => ({ filename: r.filename, score: r.score })));
  };

  const createJob = async () => {
    if (!jobTitle || !jobDesc) return alert("Enter job title and description");
    await addDoc(collection(db, 'jobs'), {
      userId: user.uid,
      title: jobTitle,
      description: jobDesc,
      createdAt: new Date()
    });
    setJobTitle('');
    setJobDesc('');
    fetchJobs(user.uid);
  };

  const handleFileUpload = (e) => setFiles(Array.from(e.target.files));

  const handleMatch = async () => {
    if (!selectedJob) return alert("Select a job first!");
    setLoading(true);
    const formData = new FormData();
    formData.append('job_description', selectedJob);
    files.forEach(file => formData.append('resumes', file));
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/match`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      for (let match of data.matches) {
        await addDoc(collection(db, 'resumes'), {
          userId: user.uid,
          jobId: selectedJobId,
          filename: match.filename,
          score: match.score,
          tag: 'Unreviewed',
          skills: match.skills,
          summary: match.summary,
          why_matched: match.why_matched
        });
      }
      fetchTaggedResumes(selectedJobId);
    } catch (err) {
      alert("Error matching resumes. Is backend running?");
    }
    setLoading(false);
  };

  const updateTag = async (resumeId, newTag) => {
    const ref = doc(db, 'resumes', resumeId);
    await updateDoc(ref, { tag: newTag });
    fetchTaggedResumes(selectedJobId);
  };

  const clearResumes = async () => {
    const q = query(collection(db, 'resumes'), where('userId', '==', user.uid), where('jobId', '==', selectedJobId));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => deleteDoc(doc(db, 'resumes', docSnap.id)));
    setSavedResumes([]);
    setTagChart([]);
    setScoreChart([]);
  };

  const exportToCSV = () => {
    const shortlisted = savedResumes.filter(res => res.tag === 'Shortlisted');
    const csvRows = [['Filename', 'Score', 'Tag']];
    shortlisted.forEach(res => csvRows.push([res.filename, res.score, res.tag]));
    const csvContent = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shortlisted_candidates.csv';
    link.click();
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // 👇 Paste this inside your App.js (replacing the old `if (!user) return (...)` block)
if (!user) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.5 }}
      className="max-w-sm mx-auto mt-20 p-8 rounded-2xl shadow-2xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
    >
      <motion.h2 
        initial={{ y: -20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-3xl font-extrabold text-center mb-6"
      >
        {isLogin ? 'Welcome Back!' : 'Create an Account'}
      </motion.h2>

      {!isLogin && (
        <input
          type="text"
          placeholder="Full Name"
          className="w-full mb-4 p-3 rounded-xl border bg-white dark:bg-gray-800"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      )}
      <input
        type="email"
        placeholder="Email Address"
        className="w-full mb-4 p-3 rounded-xl border bg-white dark:bg-gray-800"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full mb-6 p-3 rounded-xl border bg-white dark:bg-gray-800"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleAuth}
        className="w-full bg-gradient-to-tr from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold py-3 rounded-xl transition-all shadow-md"
      >
        {isLogin ? 'Login' : 'Sign Up'}
      </motion.button>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-4 w-full text-sm text-blue-600 dark:text-blue-400 hover:underline transition-all"
      >
        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
      </button>
    </motion.div>
  );
}


  // 👇 This replaces the main return (after `if (!user)` block)
return (
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    className="min-h-screen flex flex-col justify-between bg-gradient-to-tr from-gray-50 to-blue-100 dark:from-gray-900 dark:to-gray-800"
  >
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8">

      {/* 🧢 Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.7 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center bg-white dark:bg-gray-900 rounded-2xl shadow-md p-5"
      >
        <div className="flex items-center gap-2 flex-wrap">
  <motion.img 
    src="/logo.png" 
    alt="Resume Matcher Logo" 
    className="h-10 w-10 object-contain" 
    whileHover={{ rotate: 15 }}
  />
  <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-wide">
    ResumeMatcher.AI
  </h1>
</div>


        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:underline">
            🌓 Toggle Theme
          </button>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow">
            Logout
          </button>
        </div>
      </motion.header>



   {/* 📂 Main Body: Jobs + Upload */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">

{/* 📝 Left Panel: Post a Job */}
<motion.div 
  initial={{ opacity: 0, y: 20 }} 
  whileInView={{ opacity: 1, y: 0 }} 
  viewport={{ once: true }}
  transition={{ duration: 0.6 }}
  className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow space-y-6"
>
  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">📝 Post a Job</h2>
  <input 
    type="text" 
    placeholder="Job Title" 
    value={jobTitle} 
    onChange={(e) => setJobTitle(e.target.value)} 
    className="w-full p-3 rounded-lg border bg-white dark:bg-gray-800 dark:text-white focus:ring focus:ring-blue-300"
  />
  <textarea 
    rows="4"
    placeholder="Job Description" 
    value={jobDesc} 
    onChange={(e) => setJobDesc(e.target.value)} 
    className="w-full p-3 rounded-lg border bg-white dark:bg-gray-800 dark:text-white focus:ring focus:ring-blue-300"
  ></textarea>
  <button 
    onClick={createJob} 
    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-all font-semibold"
  >
    Create Job
  </button>
</motion.div>

{/* 📁 Right Panel: Upload Resumes */}
<motion.div 
  initial={{ opacity: 0, y: 20 }} 
  whileInView={{ opacity: 1, y: 0 }} 
  viewport={{ once: true }}
  transition={{ duration: 0.8 }}
  className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow space-y-6"
>
  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">📁 Upload Resumes</h2>
  <select 
    onChange={(e) => {
      const job = jobs.find(j => j.id === e.target.value);
      setSelectedJob(job?.description);
      setSelectedJobId(job?.id);
      fetchTaggedResumes(job?.id);
    }}
    className="w-full p-3 rounded-lg border bg-white dark:bg-gray-800 dark:text-white focus:ring focus:ring-blue-300"
  >
    <option value="">-- Select Job --</option>
    {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
  </select>

  {selectedJob && (
    <>
      <input 
        type="file" 
        multiple 
        accept=".pdf" 
        onChange={handleFileUpload} 
        className="w-full p-3 rounded-lg border bg-white dark:bg-gray-800 dark:text-white focus:ring focus:ring-blue-300"
      />
      <button 
        onClick={handleMatch} 
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-all font-semibold"
      >
        {loading ? 'Matching...' : 'Run AI Match'}
      </button>
      <button 
        onClick={clearResumes}
        className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg mt-2 transition-all font-semibold"
      >
        🧹 Clear Resumes
      </button>
    </>
  )}
</motion.div>

</div>

        {/* 🗂️ List of Tagged Resumes */}
{savedResumes.length > 0 && (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    whileInView={{ opacity: 1, y: 0 }} 
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
    className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow space-y-6"
  >
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">📂 Tagged Resumes</h2>
      <button
        onClick={exportToCSV}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition font-semibold"
      >
        Export CSV
      </button>
    </div>

    <div className="space-y-6">
      {savedResumes.map((res) => (
        <motion.div
          key={res.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border border-gray-200 dark:border-gray-700 p-5 rounded-2xl bg-white dark:bg-gray-900 shadow-md space-y-3"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{res.filename}</h3>
            <span className="text-green-600 dark:text-green-400 font-bold">{res.score}%</span>
          </div>

          <div className="text-sm text-gray-700 dark:text-gray-300">
            📌 <strong>Summary:</strong> {res.summary}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            💡 <strong>Why Matched:</strong> {res.why_matched}
          </div>

          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            {res.skills?.technical?.map(skill => (
              <span key={skill} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">{skill}</span>
            ))}
            {res.skills?.soft?.map(skill => (
              <span key={skill} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">{skill}</span>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              onClick={() => updateTag(res.id, 'Shortlisted')} 
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold transition"
            >
              Shortlist
            </button>
            <button 
              onClick={() => updateTag(res.id, 'Maybe')} 
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white py-2 rounded-lg text-sm font-bold transition"
            >
              Maybe
            </button>
            <button 
              onClick={() => updateTag(res.id, 'Rejected')} 
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold transition"
            >
              Reject
            </button>
          </div>

          {/* If Shortlisted, show email button */}
          {res.tag === 'Shortlisted' && (
            <div className="mt-4">
              <a 
                href={`mailto:?subject=You're Shortlisted!&body=Hi ${res.filename},%0D%0A%0D%0ACongratulations! You've been shortlisted for the role. We'll follow up shortly with next steps.%0D%0A%0D%0A— ResumeMatcher.AI`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold transition"
              >
                📧 Send Interview Email
              </a>
            </div>
          )}
        </motion.div>
      ))}
    </div>

  </motion.div>
)}


        {/* 📊 Resume Tag Summary Chart */}
{tagChart.length > 0 && (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    whileInView={{ opacity: 1, y: 0 }} 
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
    className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow space-y-4"
  >
    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">📊 Resume Tag Summary</h2>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={tagChart}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#3b82f6" barSize={50} radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </motion.div>
)}


        {/* 📈 Score Distribution Chart */}
{scoreChart.length > 0 && (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    whileInView={{ opacity: 1, y: 0 }} 
    viewport={{ once: true }}
    transition={{ duration: 0.8 }}
    className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow space-y-4"
  >
    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">📈 Score Distribution</h2>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={scoreChart}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="filename" hide />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  </motion.div>
)}

      </div>
      {/* 📢 Footer */}
   {/* 🌟 Footer Section */}
<motion.footer 
  initial={{ opacity: 0 }} 
  animate={{ opacity: 1 }} 
  transition={{ duration: 1 }}
  className="text-center py-6 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700 mt-10"
>
  <p>
    © {new Date().getFullYear()} <strong className="text-blue-600 dark:text-blue-400">ResumeMatcher.AI</strong> —
    Crafted with 💻 by{" "}
    <a 
      href="https://github.com/FareehaSaleem1" 
      target="_blank" 
      rel="noopener noreferrer"
      className="underline hover:text-blue-600 dark:hover:text-blue-300 transition"
    >
      Fareeha Saleem
    </a>
  </p>
</motion.footer>


    </motion.div>
  );
}
