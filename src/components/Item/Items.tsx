import { WeaponItems } from "./WeaponItem";
import { ShieldItems } from "./ShieldItem";
import { ScrollItems } from "./ScrollItem";
import { DropItems } from "./DropItem";


export const AllItems = [
    ...WeaponItems,
    ...ShieldItems,
    ...ScrollItems,
    ...DropItems,
];
