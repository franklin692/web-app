import * as L from "lucide-react";

export const ICON_NAMES = ["CalendarDays", "Martini", "MapPin", "Sparkles", "HeartHandshake", "House", "Briefcase", "Car", "Users", "BookOpen",
  "Music", "PartyPopper", "Trophy", "Utensils", "Beer", "Mountain", "GraduationCap", "Ticket", "Star", "Flame", "Camera", "ShoppingBag",
  "Dumbbell", "TreePine", "Drama", "Pizza", "Coffee", "Bike", "Gamepad2", "Church", "Landmark", "Baby", "Dog", "Gift", "Megaphone",
  "Wrench", "Palette", "Film", "Mic", "Tent"];

export const DynIcon = ({ name, ...p }) => {
  const C = L[name] || L.Sparkles;
  return <C {...p} />;
};
