import React from "react";

interface EquippedItemSlotProps {
  item?: {
    image?: string | { src: string };
    name?: string;
    rarity?: string;
    upgrade_level?: number;
    // Додай інші властивості item, якщо вони використовуються
  };
  fallbackIcon: string;
  onClick?: () => void;
  size?: number;
}

const EquippedItemSlot: React.FC<EquippedItemSlotProps> = ({ item, fallbackIcon, onClick, size = 50 }) => {
  const imageSrc =
    item?.image && typeof item.image === "string"
      ? item.image
      : (item?.image && typeof item.image === "object" && "src" in item.image
        ? item.image.src
        : undefined);

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px", // Цей padding задає зовнішній простір навколо рамки предмета, якщо це потрібно.
                          // Якщо ти хочеш, щоб сам div був рамкою без зовнішніх відступів, цей padding можна прибрати або змінити.
        borderRadius: "10px",
        maxWidth: "100%",
        height: "auto",
        cursor: onClick ? "pointer" : "default",
        position: "relative", // Важливо: outer div є батьком для абсолютного позиціонування
        // Тут можуть бути стилі для фону, тіні самого слота, якщо вони не на img
      }}
    >
      {item ? (
        <>
          <img
            src={imageSrc}
            alt={item.name || "item"}
            className={`item-image rarity-border-${item.rarity?.toLowerCase()}`}
            style={{
              width: size,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              padding: "10px", // Цей padding створює "рамку" навколо зображення всередині слота
              borderRadius: "10px",
              boxShadow: "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px",
              maxWidth: "100%",
              height: "auto",
            }}
          />
          {item.upgrade_level !== undefined && item.upgrade_level > 0 && (
            <span
              style={{
                position: "absolute",
                top: `11px`,
                right: `11px`, 

                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "#fff",
                fontSize: `${size * 0.3}px`,
                fontWeight: "bold",
                borderRadius: "5px",
                padding: `${size * 0.07}px ${size * 0.12}px`,
                zIndex: 2,
                minWidth: `${size * 0.4}px`,
                textAlign: "center",
                boxShadow: "rgba(0, 0, 0, 0.5) 0px 2px 5px",
                // **ВАЖЛИВО: Прибираємо трансформації, якщо використовуємо точні top/right**
                // transform: 'translateY(-50%) translateX(50%)', // Цю лінію слід видалити!
              }}
            >
              +{item.upgrade_level}
            </span>
          )}
        </>
      ) : (
        <span style={{ fontSize: size }}>{fallbackIcon}</span>
      )}
    </div>
  );
};

export default EquippedItemSlot;