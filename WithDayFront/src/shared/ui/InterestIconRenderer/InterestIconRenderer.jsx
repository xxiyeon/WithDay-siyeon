import * as FaIcons from "react-icons/fa";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

const muiIconMap = {
  PhotoCamera: PhotoCameraIcon,
};

export default function InterestIconRenderer({
  iconName,
  size = 18,
  className,
}) {
  const FaIcon = FaIcons[iconName];

  if (FaIcon) {
    return <FaIcon size={size} className={className} />;
  }

  const MuiIcon = muiIconMap[iconName];

  if (MuiIcon) {
    return <MuiIcon className={className} sx={{ fontSize: size }} />;
  }

  const FallbackIcon = FaIcons.FaHeart;
  return <FallbackIcon size={size} className={className} />;
}
