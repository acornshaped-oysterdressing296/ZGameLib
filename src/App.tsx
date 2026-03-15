import { MemoryRouter as BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Library from "@/pages/Library";
import Favorites from "@/pages/Favorites";
import RecentlyPlayedPage from "@/pages/RecentlyPlayed";
import Stats from "@/pages/Stats";
import Settings from "@/pages/Settings";
import Spin from "@/pages/Spin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Library />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/recent" element={<RecentlyPlayedPage />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/spin" element={<Spin />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
