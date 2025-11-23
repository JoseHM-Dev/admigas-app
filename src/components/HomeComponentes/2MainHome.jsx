import LogoTransparente from "../../assets/img/logo-transparente.png";
import imgCRM from "../../assets/img/icono CRM.png";
import imgCredito from "../../assets/img/icono credito.png";
import imgRecibo from "../../assets/img/icono recibo.png";
import imgSeguridad from "../../assets/img/icono seguridad y confianza.png";
import imgOperativa from "../../assets/img/icono eficiencia operativa.png";
import imgServicio from "../../assets/img/icono servicio personalisado.png";
import { BtnIniciarSesion } from "../ui/BotonIniciarSesion";
import { BotonContactanos } from "../ui/BotonContactanos";
import { Link } from "react-router-dom"; // Importamos Link


export const MainHome = () => {


    return(
        <main className="flex flex-col   items-center">
            
            <section className="flex flex-col items-center  bg-black/15 mx-15 mt-5 rounded-xl">
                <img className="flex h-[350px] w-[350px] animate-[float_3s_ease-in-out_infinite] " src={LogoTransparente} alt="Logo de la empresa" />

                <h1 className="font-poppins text-4xl font-bold">
                    ¿Quienes somos..
                </h1>

                <p className="font-poppins text-2xl font-normal text-center p-2 m-2 text-black/65">
                    Admi Gas LP somos su socio confiable en la administración  eficiente de Gas LP.
                </p>

                <div className="flex gap-8 m-4">
                    
                        <BtnIniciarSesion text="Contactar"/>
                    
                    <div className="flex items-center justify-center  border-2 border-black/50 rounded-lg p-1 hover:cursor-pointer hover:scale-105 transition-all duration-300" >
                    
                        <Link to="/Login">
                        <BotonContactanos text="Ya soy parte"/>
                        </Link>
                        
                    </div>
                </div>
            </section>

            <section className="m-5 mx-7">

                <section className="flex items-center justify-center m-3 ">
                    <h2 className="text-2xl bg-linear-to-r from-pink-600 to-purple-600 text-transparent bg-clip-text">
                        Nuestros servicios
                    </h2>
                </section>

                <section className="flex flex-col gap-6 lg:flex-row lg:p-9 transition-all duration-300">

                    <section className="flex bg-black/15 items-center p-3 rounded-lg gap-2 min-w-[630px] lg:flex-col lg:min-w-0">

                        <section className=" h-[200px] w-[200px]">
                            <img className="h-full w-full flex items-center justify-center animate-[float_3s_ease-in-out_infinite]" src={imgCRM} alt="Icono de CRM" />
                        </section>

                        <section className="flex flex-col justify-center gap-6  max-w-[350px]">
                            <h3 className="text-[17px] font-bold ">Módulo de Gestión de Clientes (CRM)</h3>
                            <p className=" font-medium text-black/70"> Crear un expediente digital completo para cada usuario.</p>
                        </section>
                        
                    </section>
                    
                    <section className="flex bg-black/15   items-center p-3 px-6 justify-between gap-2 rounded-lg  min-w-[600px] lg:flex-col-reverse lg:min-w-0 lg:gap-0 lg:pb-14">

                        

                        <section className="flex flex-col justify-center gap-6  max-w-[350px]">
                            <h3 className="text-[17px] font-bold ">Sistema de Administración de Crédito y Cobranza</h3>
                            <p className=" font-medium text-black/70"> Control Financiero y Riesgo de Crédito</p>
                        </section>

                        <section className=" h-[200px] w-[200px] ">
                            <img className="h-full w-full flex items-center justify-center animate-[float_3s_ease-in-out_infinite]" src={imgCredito} alt="Icono de crédito" />
                        </section>
                        
                    </section>

                    <section className="flex bg-black/15 items-center p-3 rounded-lg gap-2 min-w-[630px] lg:flex-col lg:min-w-0">

                        <section className=" h-[200px] w-[200px]">
                            <img className="h-full w-full flex items-center justify-center animate-[float_3s_ease-in-out_infinite]" src={imgRecibo} alt="Icono de recibo" />
                        </section>

                        <section className="flex flex-col justify-center gap-6 max-w-[350px]">
                            <h3 className="text-[17px] font-bold ">Generador y Emisor de Recibos y Facturas</h3>
                            <p className="  font-medium text-black/70">Creación de recibos detallados y facturas electrónicas (digitales o impresas) con base en el consumo registrado o el servicio prestado.</p>
                        </section>
                        
                    </section>

                </section>

            </section>


        <section className="m-5 mx-7">

                <section className="flex items-center justify-center m-3 ">
                    <h2 className="text-2xl bg-linear-to-r from-pink-600 to-purple-600 text-transparent bg-clip-text">
                        Nuestros compromiso
                    </h2>
                </section>

                <section className="flex flex-col gap-6 lg:flex-row lg:p-9 transition-all duration-300">

                    <section className="flex bg-black/15   items-center p-3 px-6 justify-between gap-2 rounded-lg  min-w-[600px] lg:flex-col-reverse lg:min-w-0">

                        

                        <section className="flex flex-col justify-center gap-6  max-w-[350px]">
                            <h3 className="text-[17px] font-bold ">Seguridad y Confianza</h3>
                            <p className=" font-medium text-black/70">Implementamos estandares de seguridad con la finalidad de que los datos se encuentren en reguardo seguro.</p>
                        </section>

                        <section className=" h-[200px] w-[200px] ">
                            <img className="h-full w-full flex items-center justify-center animate-[float_3s_ease-in-out_infinite]" src={imgSeguridad} alt="Icono de seguridad y confianza" />
                        </section>
                        
                    </section>

                    <section className="flex bg-black/15 items-center p-3 rounded-lg gap-2 min-w-[630px] lg:flex-col lg:min-w-0">

                        <section className=" h-[200px] w-[200px]">
                            <img className="h-full w-full flex items-center justify-center animate-[float_3s_ease-in-out_infinite]" src={imgOperativa} alt="Icono de eficiencia operativa" />
                        </section>

                        <section className=" flex flex-col justify-center gap-6  max-w-[350px]">
                            <h3 className="text-[17px] font-bold ">Eficiencia Operativa</h3>
                            <p className=" font-medium text-black/70">Garantizamos una eficiencia con los mas altos estandares operativos.</p>
                        </section>
                        
                    </section>
                    
                    <section className="flex bg-black/15   items-center p-3 px-6  gap-10 rounded-lg  min-w-[600px] lg:flex-col-reverse lg:min-w-0 lg:gap-0 pb-9">

                        

                        <section className=" flex flex-col justify-center gap-6  max-w-[350px] lg:justify-center ">
                            <h3 className="text-[17px] font-bold ">Servicio Personalizado</h3>
                            <p className=" font-medium text-black/70">Servicio tecnico las 24 hrs, con tecnicos capacitados para todo tipo de evento.</p>
                        </section>

                        <section className=" h-[200px] w-[200px] ">
                            <img className="h-full w-full flex items-center justify-center animate-[float_3s_ease-in-out_infinite]" src={imgServicio} alt="Icono de servicio personalizado" />
                        </section>
                        
                    </section>

                </section>

            </section>

            <section className="flex m-5" >
                <BtnIniciarSesion text="Regresar"/>
            </section>


        </main>
    )

}