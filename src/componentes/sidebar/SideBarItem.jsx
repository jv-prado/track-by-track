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
        className="flex items-center flex-row md:flex-col gap-3 md:gap-1 w-full h-full"
        onClick={onClick}
      >
        <div className="md:h-8 flex items-center justify-center">
          <Icon
            className={`${iconSize} ${
              active ? "text-verde-destaque" : ""
            } group-hover:scale-110 transition-all`}
          />
        </div>
        <div className="md:h-6 flex items-center justify-center w-full overflow-hidden">
          <span
            style={{ font: "var(--font-paragraph)" }}
            className={`${
              active ? "text-verde-destaque" : ""
            } group-hover:text-verde-destaque text-sm md:text-base whitespace-nowrap truncate`}
          >
            {text}
          </span>
        </div>
      </div>
    </li>
  );
}
