import {MainDashboard} from "../DashboardlComponents/2MainDashboard"
import { NavBarUser } from "../ui/NavBarUser";
import {Footer} from "../ui/Footer";


export const DashboardTemplate = () => {
    return(
        <section>
            <NavBarUser />
            <MainDashboard />
            <Footer />
        </section>
    )
}