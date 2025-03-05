CREATE TABLE content (
    content_id        INT PRIMARY KEY,
    title            VARCHAR(255) NOT NULL,
    thumbnail_url    VARCHAR(500),
    keywords        TEXT[], -- หรือ JSON ขึ้นอยู่กับ DBMS ที่ใช้
    content_url      VARCHAR(500) NOT NULL,
    category         VARCHAR(255),
    category_id      INT,
    sub_category     VARCHAR(255),
    author           VARCHAR(255),
    author_id        INT,
    media_type_label VARCHAR(255)
);
