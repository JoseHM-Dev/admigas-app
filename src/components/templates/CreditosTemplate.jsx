import {NavBarUser} from "../ui/NavBarUser";
import {Footer} from "../ui/Footer";
import {MainCreditos} from "../CreditosComponents/MainCreditos";

export const CreditosTemplate = () => {
    return(
        <main>
            <NavBarUser />
            <MainCreditos />
            <Footer />
        </main>
    )
}