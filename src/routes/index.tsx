import { Route, Routes } from "react-router";
import Example from "../pages/Example";

const Navigation: React.FC = () => {
  return (
    <Routes>
      <Route path="/example" element={<Example />} />
    </Routes>
  );
};

export default Navigation;
