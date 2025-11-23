

export const BtnIniciarSesion = ({text}) =>{
    return(
        <button className="bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] p-0 rounded-[10px] hover:scale-105  transition-all duration-300 bg-black/80 text-white font-bold py-2 px-2 hover:bg-transparent hover:cursor-pointer sm:hover:mx-1 sm:hover:my-1 sm:hover:bg-transparent">
            {text}
        </button>
    )
}