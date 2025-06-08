// import React, { useState,useEffect } from 'react';
// import '../styles/UserProfile.css';
// import EditProfile from '../components/EditProfile';
// import { useParams } from 'react-router-dom';

// const FriendsProfile = () => {
//   const [userData, setUserData] = useState({
//     name: '',
//     email: '',
//     phoneNumber: '',
//     profilePicture: '',
//     codeforcesHandle: '',
//     codeforcesRating: '',
//     programmingLanguages: [],
//     skills: []
//   });
//   const [cfInfo, setCfInfo] = useState(null);
//   const username = window.location.pathname.split('/').pop(); 
//   console.log("Username from URL:", username);
//   // Fetch user data (replace with your actual API call)
//   useEffect(() => {
//     const fetchUserData = async () => {
//       try {
//         const res = await fetch(`https://zcoder-backend.vercel.app/users/${username}`,
//           {
//             method: 'GET',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//           }
//         );
//         const data = await res.json();
//         console.log("Fetched user data:", data[0]);
//         setUserData(data[0]);
//         if (data.codeforcesHandle) {
//           fetchCodeforcesInfo(data.codeforcesHandle);
//         }
//       } catch (error) {
//         console.error('Error fetching user data:', error);
//       }
//     };
//     fetchUserData();
//   }, []);

//   // Fetch Codeforces info (handles array response)
//   const fetchCodeforcesInfo = async (handle) => {
//     try {
//       const res = await fetch(`https://competeapi.vercel.app/user/codeforces/${handle}/`);
//       const data = await res.json();
//       // If data is an array, use first element; else use data itself
//       const info = Array.isArray(data) ? data[0] : data;
//       setCfInfo(info);
//       // Optional: Also update codeforcesRating in userData if you want to store it
//       // setUserData(prev => ({ ...prev, codeforcesRating: info?.rating ?? '' }));
//     } catch (error) {
//       console.error('Error fetching Codeforces info:', error);
//       setCfInfo(null); // Clear on error
//     }
//   };

//   return (
//     <div className="profile-container">
//       <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Profile Page</h1>
//       <div className="profile-box">
//         <div className="profile-picture-box">
//           <img
//             src={
//               userData.profilePicture && userData.profilePicture.trim() !== ""
//                 ? userData.profilePicture
//                 : "https://static.vecteezy.com/system/resources/thumbnails/019/879/186/small_2x/user-icon-on-transparent-background-free-png.png"
//             }
//             alt="Profile"
//             className="profile-pic"
//             onError={(e) => {
//               e.target.onerror = null;
//               e.target.src = "https://static.vecteezy.com/system/resources/thumbnails/019/879/186/small_2x/user-icon-on-transparent-background-free-png.png";
//             }}
//           />
//         </div>
//         <div className="info-box">
//           <div className="user-details-box">
//             <h2>{userData.name}</h2>
//             <p>{userData.email}</p>
//             <p>{userData.phoneNumber}</p>
//           </div>
//           <div className="codeforces-box">
//             <h3>Codeforces Handle: {userData.codeforcesHandle || 'Not set'}</h3>
//             <p>Rating: {cfInfo?.rating ?? 'N/A'}</p>
//           </div>
//           <div className="skills-box">
//             <h3>Programming Languages</h3>
//             {userData.programmingLanguages.length > 0 ? (
//               <ul>
//                 {userData.programmingLanguages.map((lang, i) => (
//                   <li key={i}>{lang}</li>
//                 ))}
//               </ul>
//             ) : <p>No languages listed</p>}
//             <h3>Skills</h3>
//             {userData.skills.length > 0 ? (
//               <ul>
//                 {userData.skills.map((skill, i) => (
//                   <li key={i}>{skill}</li>
//                 ))}
//               </ul>
//             ) : <p>No skills listed</p>}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default FriendsProfile;

// 06-06-2025 5:30 pm 
import React, { useState, useEffect } from 'react';
import '../styles/UserProfile.css';
import EditProfile from '../components/EditProfile';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';

const FriendsProfile = () => {

  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    profilePicture: '',
    role: '',
    location: '',
    skills: [],
    degrees: [],
    experience: [],
    languages: [],
    codeforcesHandle: '',
  });

  const [cfInfo, setCfInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const navigate = useNavigate();
  useEffect(() => {
    const jwtoken = localStorage.getItem('jwtoken');
    if (!jwtoken) {
      navigate('/login');
    }
  }, [navigate]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const username = window.location.pathname.split('/').pop(); 
  console.log("Username from URL:", username);
  // Fetch user data (replace with your actual API call)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`https://zcoder-backend.vercel.app/users/${username}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        const data = await res.json();
        console.log("Fetched user data:", data[0]);
        setUserData(data[0]);
        if (data.codeforcesHandle) {
          fetchCodeforcesInfo(data.codeforcesHandle);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, []);

  // Fetch Codeforces info
  const fetchCodeforcesInfo = async (handle) => {
    try {
      const res = await fetch(`https://competeapi.vercel.app/user/codeforces/${handle}/`);
      const data = await res.json();
      setCfInfo(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      setCfInfo(null);
    }
  };

  // Edit profile
  const handleEdit = () => setIsEditing(true);

  // Update profile
  const handleProfileUpdate = async (updatedData) => {
    try {
      const jwtoken = localStorage.getItem('jwtoken');
      const res = await fetch('https://zcoder-backend.vercel.app/user/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtoken}`,
        },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const data = await res.json();
      const receivedData = data.user || data;
      setUserData({
        name: receivedData.name || '',
        email: receivedData.email || '',
        phoneNumber: receivedData.phoneNumber || '',
        profilePicture: receivedData.profilePicture || '',
        role: receivedData.role || '',
        location: receivedData.location || '',
        skills: Array.isArray(receivedData.skills) ? receivedData.skills : [],
        degrees: Array.isArray(receivedData.degrees) ? receivedData.degrees : [],
        experience: Array.isArray(receivedData.experience) ? receivedData.experience : [],
        languages: Array.isArray(receivedData.languages) ? receivedData.languages : [],
        codeforcesHandle: receivedData.codeforcesHandle || '',
      });
      setIsEditing(false);
      setToastMessage('Profile updated successfully!');
      setShowToast(true);
      if (receivedData.codeforcesHandle) {
        fetchCodeforcesInfo(receivedData.codeforcesHandle);
      }
    } catch (error) {
      setToastMessage('Failed to update profile. Please try again.');
      setShowToast(true);
    }
  };

  // Render EditProfile if editing
  if (isEditing) {
    return <EditProfile userData={userData} onUpdate={handleProfileUpdate} />;
  }

  // Render UserProfile
  return (
    <div className="profile-main-container">
      <div className="profile-header">
        <img
          src={
            userData.profilePicture && userData.profilePicture.trim() !== ""
              ? userData.profilePicture
              : "https://static.vecteezy.com/system/resources/thumbnails/019/879/186/small_2x/user-icon-on-transparent-background-free-png.png"
          }
          alt="Profile"
          className="profile-avatar"
        />
        <div className="profile-header-info">
          <h1>{userData.name || 'Your Name'}</h1>
          <h2>{userData.role || 'Your Role'}</h2>
          <div className="profile-contact">
            <span>{userData.email}</span>
            <span>{userData.phoneNumber}</span>
            <span>{userData.location}</span>
          </div>
        </div>
        <button className="edit-btn" onClick={handleEdit}>Edit Profile</button>
      </div>

      <div className="profile-sections">

        {/* Degrees Section */}
        <section className="profile-section degrees">
          <h3>Education</h3>
          <div className="degree-list">
            {userData.degrees.map((deg, idx) => (
              <div className="degree-card" key={idx}>
                {deg.title || 'Degree Title'}<br />
                <span>{deg.institution || 'Institution'}</span>
              </div>
            ))}
          </div>
        </section>


        {/* Skills Section */}
        <section className="profile-section skills">
          <h3>My Skills</h3>
          <ul>
            {userData.skills.map((skill, idx) => (
              <li key={idx}>
                <span>{skill.name || 'Skill Name'}</span>
                <div className="skill-bar">
                  <div className="skill-bar-fill" style={{ width: `${skill.level || 0}%` }}></div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Experience Section */}
        <div className="experience-list">
          {userData.experience.map((exp, idx) => (
            <div className="exp-card" key={idx}>
              <h4>Experience #{idx + 1}</h4> {/* Add heading for each card */}
              <div>
                <strong>{exp.role || 'Role '}</strong>
                <span>{exp.period ? `${exp.period}` : ' '}</span>
              </div>
              <p>{exp.company || 'Company'}</p>
            </div>
          ))}
        </div>

        {/* Languages Section */}
        <section className="profile-section languages">
          <h3>Programming Languages</h3>
          <div className="languages-list">
            {userData.languages.map((lang, idx) => (
              <div className="language-card" key={idx}>
                <div className="lang-percentage">{lang.level || 0}%</div>
                <div className="lang-name">{lang.name || 'Language'}</div>
                <div className="lang-fluency">{lang.fluency || 'Fluency'}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Codeforces Section */}
        {userData.codeforcesHandle && (
          <section className="profile-section codeforces">
            <h3>Codeforces Info</h3>
            {cfInfo ? (
              <div className="cf-info">
                <div><strong>Handle:</strong> <a href={`https://codeforces.com/profile/${userData.codeforcesHandle}`} target="_blank" rel="noopener noreferrer">{userData.codeforcesHandle}</a></div>
                <div><strong>Rating:</strong> {cfInfo.rating || 'N/A'}</div>
                <div><strong>Rank:</strong> {cfInfo.rank || 'N/A'}</div>
                <div><strong>Max Rating:</strong> {cfInfo.maxRating || 'N/A'}</div>
                <div><strong>Max Rank:</strong> {cfInfo.maxRank || 'N/A'}</div>
              </div>
            ) : (
              <div className="cf-info">No Codeforces data found.</div>
            )}
          </section>
        )}
      </div>

      {showToast && (
        <Toast message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
};

export default FriendsProfile;
