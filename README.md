
# ZCoder

A interactive coding community platform to practise and scale up your skills.

## run locally
### first clone the repo
``` bash
git clone https://github.com/SanthoshBhargav/ZCoder.git
cd ZCoder
```
### run backend
``` bash
cd backend
npm i 
nodemon index.js
```
also create a new file called .env in the backend folder at the same level of index.js. The format for it is
```
GROQ_API_KEY = your_api_key
```
(Create your own key at https://console.groq.com/keys)

### run frontend
then open a new terminal and
```bash
cd frontend
npm i
npm run dev
```
also create a new file called .env in the frontend folder at the same level of src,public. The format for it is
```
VITE_API_URL = https://alfa-leetcode-api.onrender.com
VITE_BACKEND_URL = https://zcoder-backend.vercel.app
VITE_JUDGE = https://emkc.org/api/v2/piston/execute
```
Then visit http://localhost:5173/

