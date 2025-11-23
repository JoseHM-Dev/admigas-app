import { NavBarUser } from "../ui/NavBarUser";
import { Footer } from "../ui/Footer";
import {MainAjustes} from "../AjustesComponents/MainAjustes";

export const AjustesTemplate = () => {
  return (
    <div>
      <header>
        <NavBarUser />
      </header>

      <MainAjustes />

      <Footer />
    </div>
  );
};
