import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';

export const BtnAjustes = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/ajustes');
  };

  return (
    <button
      onClick={handleClick}
      className="bg-black/25 rounded-[20px] px-4 py-2 shadow-lg hover:shadow-2xl hover:cursor-pointer hover:bg-black/40 transition-all duration-200 text-black/70 font-medium hover:bg-linear-to-r from-[#5180f6] via-[#6d72f9] to-[#9777e9] hover:text-white hover:-translate-y-0.5"
    >
      <span className="flex items-center gap-2">
        <Icon icon="line-md:cog-loop" className="text-xl" />
        Ajustes
      </span>
    </button>
  );
};