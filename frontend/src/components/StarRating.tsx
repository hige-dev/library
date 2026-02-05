interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function StarRating({
  rating,
  onChange,
  readonly = false,
  size = 'medium',
}: StarRatingProps) {
  const sizeClass = {
    small: 'star-rating-small',
    medium: 'star-rating-medium',
    large: 'star-rating-large',
  }[size];

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      onChange(value);
    }
  };

  return (
    <div className={`star-rating ${sizeClass} ${readonly ? 'readonly' : 'interactive'}`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span
          key={value}
          className={`star ${value <= rating ? 'filled' : 'empty'}`}
          onClick={() => handleClick(value)}
          role={readonly ? 'img' : 'button'}
          aria-label={`${value}つ星`}
          tabIndex={readonly ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClick(value);
            }
          }}
        >
          {value <= rating ? '\u2605' : '\u2606'}
        </span>
      ))}
    </div>
  );
}
