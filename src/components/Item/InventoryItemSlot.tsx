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
  // Логіка визначення джерела зображення
  const imageSrc =
    item?.image && typeof item.image === "string"
      ? item.image
      : typeof item?.image === 'object' && item.image !== null && 'src' in item.image
        ? item.image.src
        : null; // null, якщо зображення відсутнє або неправильний формат

  // Перевірка наявності предмета (хоча у твоєму map він завжди буде)
  if (!item) {
      // Можеш повернути пустий слот або щось інше, якщо цей компонент буде використовуватись для порожніх слотів
      return (
        <div style={{ /* Стилі для порожнього слоту */ }}>
           {/* Можливо, fallbackIcon тут? */}
        </div>
      );
  }


  return (
    <div
      // key тут краще використовувати у батьківському компоненті в map
      onClick={onClick}
      className={`relative flex flex-col items-center bg-white/[0.05] rounded-lg p-2 animate-fadeIn opacity-0 rarity-${item.rarity?.toLowerCase()}`}
      style={{
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: "10px",
        padding: "20px", // Задаємо внутрішній відступ для картки
        // animationDelay та інші анімаційні стилі можна прокинути через пропси або залишити тут
        // animation: "fadeIn 0.7s ease forwards", // Анімацію можна залишити тут
      }}
      // Якщо потрібен загальний клік по картці (наприклад, для детального перегляду), додай onClick сюди
      // onClick={() => alert(`Клік по ${item.name}`)}
    >
      {/* Контейнер для зображення/іконки та мітки рідкості */}
      <div style={{
        width: "100%", // Ширина контейнера зображення
        aspectRatio: "1 / 1", // Співвідношення сторін 1:1
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2rem", // Розмір іконки/тексту, якщо немає зображення
        color: item ? "#fff" : "#777",
        marginBottom: "10px",
        position: "relative", // Для позиціонування мітки рідкості
      }}>
        {/* Мітка рідкості */}
        {item.rarity && (
          <div className="rarity-label">
            {item.rarity.toUpperCase()}
          </div>
        )}

        {/* Зображення предмета або альтернатива */}
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.name || "Предмет"}
            className={`item-image rarity-border-${item.rarity?.toLowerCase()}`}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)", // Фон зображення
              padding: "10px", // Внутрішній відступ зображення
              borderRadius: "10px",
              // boxShadow: "rgba(0, 0, 0, 0.3) 0px 19px 38px, rgba(0, 0, 0, 0.22) 0px 15px 12px", // Тінь зображення
              maxWidth: "90%", // Зображення не більше контейнера
              maxHeight: "90%", // Зображення не більше контейнера
              objectFit: "contain", // Масштабування зображення
            }}
          />
        ) : (
          // Альтернатива, якщо немає зображення (назва або плейсхолдер)
          <div style={{ textAlign: 'center' }}>
            {item.name || "+"} {/* Відобразити назву або "+" */}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryItemCard;