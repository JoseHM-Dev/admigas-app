import {MainVentas} from "../VentasComponents/2MainVentas"
import { NavBarUser } from "../ui/NavBarUser";
import {Footer} from "../ui/Footer";


export const VentasTemplate = () => {
    return(
        <section>
            <NavBarUser />
            <MainVentas />
            <Footer />
        </section>
    )
}