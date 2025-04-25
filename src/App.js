// ✅ COMPLETE App.js File With All Fixes Applied
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile
} from 'firebase/auth';
import {
  getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

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

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto mt-20 p-8 rounded-xl shadow-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white">
        <h2 className="text-2xl font-bold text-center mb-4">
          {isLogin ? 'Login' : 'Sign Up'} to Resume Matcher
        </h2>
        {!isLogin && <input type="text" className="w-full p-2 mb-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />}
        <input type="email" className="w-full p-2 mb-2 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="w-full p-2 mb-4 rounded border bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleAuth} className="w-full bg-blue-600 text-white py-2 rounded transition transform hover:scale-105 duration-300
">{isLogin ? 'Login' : 'Sign Up'}</button>
        <button onClick={() => setIsLogin(!isLogin)} className="mt-2 text-sm text-blue-600 underline w-full text-center transition transform hover:scale-105 duration-300
">
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="min-h-screen px-6 py-10 bg-gradient-to-tr from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
      <header className="bg-white dark:bg-gray-900 shadow-sm rounded-xl px-6 py-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
  <img src="/logo192.png" alt="Logo" className="h-8 w-8" />
  <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">ResumeMatcher.AI</h1>
</div>

  <div className="flex items-center gap-3">
    <button
      onClick={toggleTheme}
      className="text-sm text-gray-600 dark:text-gray-300 hover:underline"
    >
      🌓 Theme
    </button>
    <button
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow-sm transition"
    >
      Logout
    </button>
  </div>
</header>


        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-semibold">📝 Post a Job</h2>
            <input className="w-full border p-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            <textarea rows={4} className="w-full border p-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Job Description" value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />
            <button onClick={createJob} className="w-full bg-blue-600 text-white py-2 rounded transition transform hover:scale-105 duration-300
">Create</button>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-semibold">📁 Upload Resumes</h2>
            <select className="w-full border p-2 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-white" onChange={(e) => {
              const job = jobs.find(j => j.id === e.target.value);
              setSelectedJob(job?.description);
              setSelectedJobId(job?.id);
              fetchTaggedResumes(job?.id);
            }}>
              <option value="">-- Select Job --</option>
              {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
            {selectedJob && (
              <>
                <input type="file" className="w-full border p-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" multiple accept=".pdf" onChange={handleFileUpload} />
                <button onClick={handleMatch} disabled={loading} className="w-full bg-green-600 text-white py-2 rounded transition transform hover:scale-105 duration-300
">{loading ? 'Matching...' : 'Run AI Match'}</button>
                <button onClick={clearResumes} className="mt-2 w-full bg-gray-500 text-white py-2 rounded transition transform hover:scale-105 duration-300
">🧹 Clear Tagged Resumes</button>
              </>
            )}
          </div>
        </div>

        {savedResumes.length > 0 && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">📂 Tagged Resumes</h2>
              <button onClick={exportToCSV} className="bg-blue-600 text-white px-3 py-1 rounded transition transform hover:scale-105 duration-300
">Export CSV</button>
            </div>
            <ul className="space-y-4">
              {savedResumes.map((res) => (
                <motion.li
                  key={res.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 border rounded-xl shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                >
                  <div className="font-semibold">{res.filename}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">Score: <strong className="text-green-600 dark:text-green-400">{res.score}%</strong></div>
                  <div className="text-sm">📌 {res.summary}</div>
                  <div className="text-sm">💡 {res.why_matched}</div>
                  <div className="text-sm">🏷️ Tag: {res.tag}</div>
                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    {res.skills?.technical?.map(skill => <span key={skill} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{skill}</span>)}
                    {res.skills?.soft?.map(skill => <span key={skill} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">{skill}</span>)}
                  </div>
                  <div className="mt-2 space-x-2">
                    <button onClick={() => updateTag(res.id, 'Shortlisted')} className="bg-green-500 text-white px-2 py-1 rounded">Shortlist</button>
                    <button onClick={() => updateTag(res.id, 'Maybe')} className="bg-yellow-400 text-white px-2 py-1 rounded transition transform hover:scale-105 duration-300
">Maybe</button>
                    <button onClick={() => updateTag(res.id, 'Rejected')} className="bg-red-500 text-white px-2 py-1 rounded transition transform hover:scale-105 duration-300
">Reject</button>
                  </div>
                  {res.tag === 'Shortlisted' && (
  <div className="mt-3">
    <a
      href={`mailto:?subject=You're Shortlisted!&body=Hi ${res.filename},%0D%0A%0D%0ACongratulations! You've been shortlisted for the role. We'll follow up shortly with next steps.%0D%0A%0D%0A— ResumeMatcher.AI`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
    >
      📧 Send Interview Email
    </a>
  </div>
)}

                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {tagChart.length > 0 && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-semibold">📊 Resume Tag Summary</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tagChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#3b82f6" /></BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {scoreChart.length > 0 && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow space-y-4">
            <h2 className="text-xl font-semibold">📈 Score Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="filename" hide /><YAxis /><Tooltip /><Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <footer className="text-center text-xs text-gray-500 dark:text-gray-400 mt-12 py-6 border-t border-gray-200 dark:border-gray-700">
  <p>
    © {new Date().getFullYear()} <strong className="text-blue-600 dark:text-blue-400">ResumeMatcher.AI</strong> — Crafted with 💻 by{" "}
    <a href="https://github.com/FareehaSaleem1" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600 dark:hover:text-blue-300">
      Fareeha Saleem
    </a>
  </p>
</footer>

    </motion.div>
  );
}
