import { supabase } from './supabaseClient'; // Імпортуємо supabase як іменований експорт

// Типізація об'єкта користувача
interface User {
  id: string;
  username: string;
  photoUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  isBot: boolean;
  isPremium: boolean;
  languageCode: string;
  allowsWriteToPm: boolean;
}

const saveUserToDB = async (user: User) => { // Задаємо тип для параметра user
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert([
        {
          id: user.id,
          username: user.username,
          photo_url: user.photoUrl,
          first_name: user.firstName,
          last_name: user.lastName,
          is_bot: user.isBot,
          is_premium: user.isPremium,
          language_code: user.languageCode,
          allows_to_write_to_pm: user.allowsWriteToPm,
          created_at: new Date(),
        },
      ]);

    if (error) {
      console.log('Error saving user to DB:', error.message);
    } else {
      console.log('User saved to DB:', data);
    }
  } catch (error: unknown) { // Вказуємо тип error як unknown
    // Перевірка типу error
    if (error instanceof Error) {
      console.log('Error during user data save:', error.message);
    } else {
      console.log('An unknown error occurred during user data save.');
    }
  }
};

export default saveUserToDB;
