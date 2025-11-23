import {MainAdministracion} from "../AdministracionComponents/MainAdministracion";
import {NavBarUser} from "../ui/NavBarUser";
import {Footer} from "../ui/Footer";

export const AdministracionTemplate = () => {
    return(
        <main>
            <NavBarUser />
            <MainAdministracion />
            <Footer />
        </main>
    )
}