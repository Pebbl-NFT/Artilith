import React from "react";

// Можеш визначити більш точний тип для предмета, якщо знаєш його структуру
interface InventoryItem {
  id?: string | number; // Унікальний ідентифікатор
  name: string;
  image?: string | { src: string }; // Може бути string або об'єкт { src: string }
  rarity?: string; // Рідкість предмета
  equipped?: boolean; // Чи екіпіровано предмет
  // Додай інші властивості предмета тут, якщо потрібно
  [key: string]: any; // Дозволити будь-які інші властивості
}

interface InventoryItemCardProps {
  item: InventoryItem; // Тепер очікуємо, що предмет завжди є
  index: number; // Індекс предмета в масиві для обробника кліку
  onEquipToggle: (index: number) => void; // Обробник для кнопки екіпірування/зняття
  onClick?: React.MouseEventHandler<HTMLDivElement>; // Додаємо onClick як необов'язковий проп
  fallbackIcon: string;
}

const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
  item,
  index,
  fallbackIcon,
  onClick,
}) => {
  const imageSrc = item?.image
    ? typeof item.image === "string"
      ? item.image
      : "src" in item.image
      ? item.image.src
      : null
    : null;

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center bg-white/[0.05] rounded-lg p-2 rarity-${item.rarity?.toLowerCase()}`}
      style={{
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: "10px",
        padding: "20px",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2rem",
          color: item ? "#fff" : "#777",
          position: "relative",
        }}
      >
        {item.rarity && (
          <div className="rarity-label">{item.rarity.toUpperCase()}</div>
        )}
        {/* Зображення предмета */}
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name || "Предмет"}
            className={`item-image rarity-border-${item.rarity?.toLowerCase()}`}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "10px",
              maxWidth: "80%",
              maxHeight: "80%",
              objectFit: "contain",
            }}
          />
        ) : (
          <div style={{ textAlign: "center" }}>{item.name || "+"}</div>
        )}
      </div>
      {/* Відображення кількості предметів (якщо більше 1) */}
      {item.count > 1 && (
        <span
          style={{
            position: "absolute",
            bottom: "8px",
            right: "10px",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "12px",
            fontSize: "0.8rem",
            fontWeight: "bold",
          }}
        >
          x{item.count}
        </span>
      )}
    </div>
  );
};

export default InventoryItemCard;