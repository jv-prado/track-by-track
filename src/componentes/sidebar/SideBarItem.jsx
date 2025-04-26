export default function SidebarItem({
  icon: Icon,
  text,
  onClick,
  iconSize = "text-xl",
  active = false,
}) {
  return (
    <li className="group cursor-pointer w-full">
      <div
        className="flex items-center flex-row md:flex-col gap-3 md:gap-1 w-full"
        onClick={onClick}
      >
        <Icon
          className={`${iconSize} ${
            active ? "text-verde-destaque" : ""
          } group-hover:scale-110 transition-all`}
        />
        <span
          style={{ font: "var(--font-paragraph)" }}
          className={`${
            active ? "text-verde-destaque" : ""
          } group-hover:text-verde-destaque text-sm md:text-base`}
        >
          {text}
        </span>
      </div>
    </li>
  );
}
