import {NavBarUser} from "../ui/NavBarUser"
import {Footer} from "../ui/Footer";
import {MainClientes} from "../ClientesComponents/MainClientes";

export const ClientesTemplate = () => {
    return(
        <main>
            <NavBarUser />
            <MainClientes />
            <Footer />
        </main>
    )
}