import { Link } from 'react-router-dom';
import type { BookWithLoan } from '../types';
import { getImageUrl } from '../config';
import { StarRating } from './StarRating';

interface BookCardProps {
  book: BookWithLoan;
  currentUserEmail?: string;
  isAdmin?: boolean;
  onBorrow?: () => void;
  onReturn?: () => void;
}

export function BookCard({ book, currentUserEmail, isAdmin, onBorrow, onReturn }: BookCardProps) {
  const isOnLoan = book.currentLoan !== null;
  const isBorrowedByMe = book.currentLoan?.borrower === currentUserEmail;
  const canReturn = isBorrowedByMe || isAdmin;

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <Link to={`/books/${book.id}`} className="book-card">
      <div className="book-image-container">
        <img
          src={getImageUrl(book.imageUrl)}
          alt={book.title}
          className="book-image"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/no-image.svg';
          }}
        />
        {isOnLoan && <span className="loan-badge">貸出中</span>}
      </div>
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-authors">{book.authors.join(', ')}</p>
        {book.reviewCount !== undefined && book.reviewCount > 0 && (
          <div className="book-rating">
            <StarRating rating={Math.round(book.averageRating || 0)} readonly size="small" />
            <span className="rating-count">({book.reviewCount})</span>
          </div>
        )}
        {isOnLoan && book.currentLoan && (
          <p className="loan-info">{book.currentLoan.borrower}</p>
        )}
      </div>
      <div className="book-card-actions">
        {!isOnLoan && onBorrow && (
          <button
            className="btn btn-sm btn-primary"
            onClick={(e) => handleButtonClick(e, onBorrow)}
          >
            借りる
          </button>
        )}
        {isOnLoan && canReturn && onReturn && (
          <button
            className="btn btn-sm btn-success"
            onClick={(e) => handleButtonClick(e, onReturn)}
          >
            返却
          </button>
        )}
      </div>
    </Link>
  );
}
