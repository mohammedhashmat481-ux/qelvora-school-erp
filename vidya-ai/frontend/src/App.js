import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import AppLayout from "./pages/AppLayout";
import PaperPage from "./pages/PaperPage";

function App() {
  useEffect(() => {
    // Capture and persist the active affiliated school board configuration on initial app mount
    const params = new URLSearchParams(window.location.search);
    const board = params.get("board");
    if (board) {
      localStorage.setItem("school_board", board);
    }
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="paper" replace />} />
            <Route path="paper" element={<PaperPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
