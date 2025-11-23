export const BtnImgSpan = ({text, imagen}) => {
    return(
        <section className="group flex flex-col items-center justify-center relative w-28 hover:animate-pulse hover:scale-110 transition-all duration-50">
                <img className="h-20 w-20" src={imagen}  />
                <span className="absolute top-20 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-4 group-hover:translate-y-0 text-[#00A8DE]">
                    {text}
                </span>
        </section>
    )
}