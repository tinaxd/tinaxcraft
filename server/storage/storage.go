package storage

import (
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

type Storage struct {
	db *sqlx.DB
}

func Connect(filename string) (*Storage, error) {
	db, err := sqlx.Open("sqlite3", filename)
	if err != nil {
		return nil, err
	}

	return &Storage{
		db: db,
	}, nil
}
