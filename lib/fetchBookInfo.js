module.exports = async (isbn) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    );

    const data = await response.json();

    // Check if book was found
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const bookData = data.items[0].volumeInfo;

    const title = bookData.title || "（タイトル情報を取得できませんでした）";
    const author = bookData.authors
      ? bookData.authors.join(", ")
      : "（著者情報を取得できませんでした）";

    let publishDate = "（出版日の情報を取得できませんでした）";
    if (bookData.publishedDate) {
      const date = new Date(bookData.publishedDate);
      if (!isNaN(date.getTime())) {
        publishDate = `${date.getFullYear()}年${
          date.getMonth() + 1
        }月${date.getDate()}日`;
      }
    }

    const description =
      bookData.description || "（説明を取得できませんでした）";

    const identifiers = bookData.industryIdentifiers || [];
    const isbn10 =
      identifiers.find((id) => id.type === "ISBN_10")?.identifier || null;
    const isbn13 =
      identifiers.find((id) => id.type === "ISBN_13")?.identifier || null;

    return {
      title,
      author,
      publishDate,
      description,
      isbn10,
      isbn13,
    };
  } catch (error) {
    console.error("Error fetching book information:", error);
    throw error;
  }
};
