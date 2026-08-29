import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import RoomSelection from "./pages/RoomSelection";
import RoomPage from "./pages/RoomPage";
import AskAIPage from "./pages/AskAIPage";
import Calendar from "./pages/Calendar";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProblemDetail from "./pages/ProblemDetail";
import Discussions from "./pages/Discussion";
import SolutionDetail from "./pages/SolutionDetail";
import Header from "./components/Header";
import UserProfile from './pages/UserProfile';
import FriendsProfile from "./pages/FriendsProfile";
import Bookmarks from "./pages/Bookmarks";
import SoloCodeEditor from "./components/SoloCodeEditor";
import ProtectedRoute from "./components/ProtectedRoute";

const protectedPage = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={protectedPage(<Home />)} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rooms" element={protectedPage(<RoomSelection />)} />
        <Route path="/rooms/:roomId" element={protectedPage(<RoomPage />)} />
        <Route path="/askAI" element={protectedPage(<AskAIPage />)} />
        <Route path="/calendar" element={protectedPage(<Calendar />)} />
        <Route path="/dashboard" element={protectedPage(<Dashboard />)} />
        <Route path="/problem/:titleSlug" element={protectedPage(<ProblemDetail />)} />
        <Route path="/discussions/:titleSlug" element={protectedPage(<Discussions />)} />
        <Route path="/solution/:id" element={protectedPage(<SolutionDetail />)} />
        <Route path="/profile" element={protectedPage(<UserProfile />)} />
        <Route path="/user/:id" element={protectedPage(<FriendsProfile />)} />
        <Route path="/bookmarks" element={protectedPage(<Bookmarks />)} />
        <Route path="/code-editor" element={protectedPage(<SoloCodeEditor />)} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
