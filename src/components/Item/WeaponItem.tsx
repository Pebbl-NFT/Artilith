import sword01a from "../../app/_assets/item/sword01a.png";
import sword02a from "../../app/_assets/item/sword02a.png";
import sword01b from "../../app/_assets/item/sword01b.png";

export const WeaponItems = [
    {
      item_id: 1,
      type: "weapon",
      rarity: 'common',
      name: "Навчальний меч",
      description: "",
      damage: 1,
      defense: 0,
      price: 30,
      image: sword01a.src,
    },
    {
      item_id: 10,
      type: "weapon",
      rarity: 'uncommon',
      name: "Сталевий меч",
      description: "",
      damage: 6,
      defense: 1,
      price: 1500,
      image: sword02a.src,
    },
  ];