"""
Master Schedule PDF Parser

This module handles parsing of master schedule PDFs to extract:
1. Class information (class number, room number, grade level)
2. Schedule conflicts (day and period numbers)
3. Multi-line entries and multiple conflicts per day

Format expectations are documented in SCHEDULE_FORMAT.md
"""

from typing import Dict, List, Optional, Tuple, Set
import pdfplumber
import re
import json
import sys
import argparse

class ValidationError(Exception):
    """Raised when parsed data fails validation."""
    pass

class ClassInfo:
    """Represents extracted information about a class."""
    
    VALID_GRADES = {'Pre-K', 'K', '1', '2', '3', '4', '5', 'multiple'}
    VALID_PERIODS = set(range(1, 9))  # 1-8
    
    # Valid patterns for class identifiers
    VALID_CLASS_PATTERNS = [
        r'^PK\d{3}$',                    # Pre-K rooms
        r'^K-\d{3}$',                    # Kindergarten rooms
        r'^\d-\d{3}$',                   # Grade 1-5 rooms
        r'^[K\d]/[K\d]/[K\d]-\d{3}$'    # Multiple grade rooms
    ]
    
    # Map day names to numbers
    DAY_MAP = {
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5
    }
    
    def __init__(
        self,
        class_id: str,
        grade_level: str,
    ):
        self.validate_class_id(class_id)
        self.validate_grade_level(grade_level)
        
        self.class_id = class_id
        self.grade_level = grade_level
        self.conflicts: Dict[str, List[int]] = {
            'Monday': [],
            'Tuesday': [],
            'Wednesday': [],
            'Thursday': [],
            'Friday': []
        }
        
        # Track all conflicts for uniqueness validation
        self._all_conflicts: Set[Tuple[str, int]] = set()

    @staticmethod
    def validate_class_id(class_id: str) -> None:
        """Validate class identifier format."""
        if not any(re.match(pattern, class_id) for pattern in ClassInfo.VALID_CLASS_PATTERNS):
            raise ValidationError(f"Invalid class identifier format: {class_id}")

    def validate_grade_level(self, grade_level: str) -> None:
        """Validate grade level."""
        if grade_level not in self.VALID_GRADES:
            raise ValidationError(f"Invalid grade level: {grade_level}")

    def validate_period(self, period: int) -> None:
        """Validate period number."""
        if period not in self.VALID_PERIODS:
            raise ValidationError(f"Invalid period number: {period}")

    def add_conflict(self, day: str, period: int) -> None:
        """
        Add a conflict period for a specific day.
        
        Args:
            day: Day of the week
            period: Period number (1-8)
            
        Raises:
            ValidationError: If period is invalid or duplicate
        """
        self.validate_period(period)
        
        # Check for duplicate conflicts
        conflict = (day, period)
        if conflict in self._all_conflicts:
            return  # Skip duplicates silently
        
        self._all_conflicts.add(conflict)
        if period not in self.conflicts[day]:
            self.conflicts[day].append(period)
            self.conflicts[day].sort()
    
    def validate(self) -> None:
        """
        Validate the complete class information.
        
        Raises:
            ValidationError: If validation fails
        """
        # Validate grade level matches class ID format
        class_prefix = self.class_id.split('-')[0]
        expected_grade = None
        
        if class_prefix.startswith('PK'):
            expected_grade = 'Pre-K'
        elif class_prefix == 'K':
            expected_grade = 'K'
        elif '/' in class_prefix:
            # For multiple grade rooms, all parts should be valid grades
            grades = class_prefix.split('/')
            for grade in grades:
                if grade not in ['K'] + list(map(str, range(1, 6))):
                    raise ValidationError(
                        f"Invalid grade {grade} in multiple-grade class {self.class_id}"
                    )
            expected_grade = 'multiple'
        else:
            grade_match = re.match(r'(\d)', class_prefix)
            if grade_match:
                expected_grade = grade_match.group(1)
                if int(expected_grade) > 5:
                    raise ValidationError(
                        f"Invalid grade number {expected_grade} in class {self.class_id}"
                    )
        
        if expected_grade != self.grade_level:
            raise ValidationError(
                f"Grade level {self.grade_level} doesn't match class identifier format {self.class_id}"
            )
        
        # Validate we have at least one conflict
        if not any(self.conflicts.values()):
            raise ValidationError(
                f"Class {self.class_id} has no conflicts"
            )
        
        # Validate no more than 8 conflicts per day
        for day, periods in self.conflicts.items():
            if len(periods) > 8:
                raise ValidationError(
                    f"Class {self.class_id} has {len(periods)} conflicts on {day}, maximum is 8"
                )
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        # Convert conflicts to TypeScript format
        default_conflicts = []
        for day, periods in self.conflicts.items():
            for period in periods:
                default_conflicts.append({
                    'dayOfWeek': self.DAY_MAP[day],
                    'period': period
                })
        
        return {
            'classNumber': self.class_id,
            'grade': self.grade_level,
            'defaultConflicts': default_conflicts,
            'active': True
        }

class MasterScheduleParser:
    """Parser for master schedule PDFs."""
    
    DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    
    # Subjects that indicate conflicts
    SUBJECTS = {'tech', 'lib', 'art', 'pe-p', 'pe-s', 'dance', 'math', 'music', 'sci', 'marchiano', 'sena'}
    
    # Expected x-positions for each day's column (will be calibrated from data)
    DAY_COLUMNS = []
    
    def __init__(self, pdf_path: str):
        """Initialize parser with path to PDF file."""
        self.pdf_path = pdf_path
        self.classes: Dict[str, ClassInfo] = {}
        self.debug = True  # Enable debug output
        
    def parse(self) -> Dict[str, ClassInfo]:
        """
        Parse the PDF and extract all class information and conflicts.
        
        Returns:
            Dict mapping class numbers to ClassInfo objects
            
        Raises:
            ValidationError: If parsed data fails validation
        """
        with pdfplumber.open(self.pdf_path) as pdf:
            # Process each page
            for page in pdf.pages:
                # Try to find day columns in the header
                if not self.DAY_COLUMNS:
                    self._calibrate_day_columns(page)
                if self.debug:
                    print("\nCalibrated day columns:", file=sys.stderr)
                    for i, x in enumerate(self.DAY_COLUMNS):
                        print(f"{self.DAYS[i]}: x = {x}", file=sys.stderr)
                    print(file=sys.stderr)
                self._process_page(page)
        
        # Validate results
        self._validate_results()
        return self.classes
    
    def _validate_results(self) -> None:
        """
        Validate the complete parsing results.
        
        Raises:
            ValidationError: If validation fails
        """
        # Check class numbers are unique
        class_ids = set()
        for class_id in self.classes:
            if class_id in class_ids:
                raise ValidationError(f"Duplicate class identifier: {class_id}")
            class_ids.add(class_id)
        
        # Validate each class's complete information
        for class_info in self.classes.values():
            class_info.validate()
        
        # Check grade level distribution
        grade_counts = {}
        for class_info in self.classes.values():
            grade_counts[class_info.grade_level] = grade_counts.get(class_info.grade_level, 0) + 1
        
        if self.debug:
            print("\nGrade level distribution:", file=sys.stderr)
            for grade, count in sorted(grade_counts.items()):
                print(f"{grade}: {count} classes", file=sys.stderr)
    
    def _calibrate_day_columns(self, page) -> None:
        """Determine the x-positions for each day's column."""
        if self.DAY_COLUMNS:  # Already calibrated
            return
            
        # Extract text with positioning
        text = page.extract_words(
            x_tolerance=3,
            y_tolerance=3,
            keep_blank_chars=True,
            extra_attrs=['size']  # Get font size information
        )
        
        # Look for day names in the header (they should be larger font)
        day_positions = []
        
        for word in text:
            # Check if this word is a day name
            word_text = word['text'].lower()
            for day in self.DAYS:
                if day.lower() in word_text:
                    x_pos = word['x0']
                    if self.debug:
                        print(f"Found day {day} at x = {x_pos}", file=sys.stderr)
                    day_positions.append((day, x_pos))
        
        if not day_positions:
            print("Warning: No day headers found, using fixed positions", file=sys.stderr)
            # Use fixed positions as fallback
            self.DAY_COLUMNS = [150, 250, 350, 450, 550]
            return
            
        # Sort by x position
        day_positions.sort(key=lambda x: x[1])
        
        # Extract x positions in the correct order
        day_order = {day: i for i, day in enumerate(self.DAYS)}
        ordered_positions = []
        
        for day, pos in day_positions:
            idx = day_order.get(day.title())
            if idx is not None:
                while len(ordered_positions) < idx:
                    # Fill in missing positions
                    if ordered_positions:
                        # Interpolate between known positions
                        prev_pos = ordered_positions[-1]
                        step = (pos - prev_pos) / (idx - len(ordered_positions) + 1)
                        ordered_positions.append(prev_pos + step)
                    else:
                        # No previous position, extrapolate backwards
                        step = (pos - 150) / idx  # Assume 150 as leftmost position
                        ordered_positions.append(pos - step * (idx - len(ordered_positions)))
                ordered_positions.append(pos)
        
        # Fill in any remaining positions
        while len(ordered_positions) < 5:
            if ordered_positions:
                # Extrapolate forward
                step = (ordered_positions[-1] - ordered_positions[-2])
                ordered_positions.append(ordered_positions[-1] + step)
            else:
                # No positions found, use fixed positions
                ordered_positions = [150, 250, 350, 450, 550]
        
        self.DAY_COLUMNS = ordered_positions[:5]
    
    def _process_page(self, page) -> None:
        """
        Process a single page of the PDF.
        
        Args:
            page: pdfplumber page object
        """
        # Extract text with positioning - use larger tolerances
        text = page.extract_words(
            x_tolerance=5,  # Adjusted from 8
            y_tolerance=3,
            keep_blank_chars=True
        )
        
        # Group text into lines based on y-position
        lines = self._group_into_lines(text)
        
        # Process each line
        current_class = None
        continuation_line = False
        
        for line in lines:
            # Try to extract class info from line
            class_info = self._extract_class_info(line)
            if class_info:
                current_class = class_info
                self.classes[class_info.class_id] = class_info
                continuation_line = False
            else:
                continuation_line = True
            
            # Extract conflicts if we have a current class
            if current_class:
                self._extract_conflicts(line, current_class, continuation_line)
    
    def _group_into_lines(self, words: List[Dict]) -> List[List[Dict]]:
        """Group words into lines based on y-position."""
        # Sort by y-position first, then x-position
        sorted_words = sorted(words, key=lambda w: (w['top'], w['x0']))
        
        lines = []
        current_line = []
        current_y = None
        
        for word in sorted_words:
            if current_y is None:
                current_y = word['top']
            
            # If this word is on a new line
            if abs(word['top'] - current_y) > 5:  # 5 is tolerance for same line
                if current_line:
                    lines.append(current_line)
                current_line = [word]
                current_y = word['top']
            else:
                current_line.append(word)
        
        if current_line:
            lines.append(current_line)
        
        return lines
    
    def _extract_class_info(self, line: List[Dict]) -> Optional[ClassInfo]:
        """
        Try to extract class information from a line.
        
        Expected format: "001 PK207" or similar
        Returns ClassInfo object if successful, None otherwise
        """
        if not line or len(line) < 2:
            return None
            
        # Get the class identifier from the second column
        class_id = line[1]['text'].strip()
        
        # Skip if this is not a valid class identifier
        if not any(re.match(pattern, class_id) for pattern in ClassInfo.VALID_CLASS_PATTERNS):
            return None
        
        # Determine grade level from class identifier
        grade_level = self._determine_grade_level(class_id)
        if grade_level == 'unknown':
            return None
        
        try:
            return ClassInfo(class_id, grade_level)
        except ValidationError as e:
            if self.debug:
                print(f"Failed to create ClassInfo: {e}", file=sys.stderr)
            return None
    
    def _determine_grade_level(self, class_id: str) -> str:
        """Determine grade level from class identifier format."""
        if class_id.startswith('PK'):
            return 'Pre-K'
        elif class_id.startswith('K-'):
            return 'K'
        elif '/' in class_id:
            return 'multiple'
        else:
            # Try to extract grade number
            grade_match = re.match(r'(\d)-', class_id)
            if grade_match:
                return grade_match.group(1)
        return 'unknown'
    
    def _extract_conflicts(self, line: List[Dict], class_info: ClassInfo, continuation_line: bool) -> None:
        """
        Extract conflicts from a line for a specific class.
        
        Format: Subject followed by period number (e.g., "Tech 2", "Lib 3")
        """
        if not line or not self.DAY_COLUMNS:
            return
            
        # Skip the first two words if this is a new class line (class number and room)
        start_idx = 2 if not continuation_line else 0
        
        # Process each word
        i = start_idx
        while i < len(line):
            word = line[i]
            # Look for period numbers
            period_match = re.search(r'([1-8])', word['text'])
            if period_match:
                # Determine which day's column this belongs to
                x_pos = word['x0']
                
                # Find the appropriate day column
                # Use a tolerance-based approach instead of just finding the closest
                day_idx = None
                min_distance = float('inf')
                for idx, col_x in enumerate(self.DAY_COLUMNS):
                    distance = abs(x_pos - col_x)
                    if distance < min_distance and distance < 100:  # Increased tolerance
                        min_distance = distance
                        day_idx = idx
                
                if day_idx is not None:
                    day = self.DAYS[day_idx]
                    period = int(period_match.group(1))
                    
                    # Look for subject in previous words
                    subject = None
                    for j in range(i - 1, max(start_idx - 1, i - 3), -1):
                        if j >= 0 and j < len(line):
                            prev_word = line[j]['text'].lower()
                            # Check if it's a subject and its x-position is close to the period
                            if not re.match(r'^\d+$', prev_word):
                                subject = prev_word
                                break
                    
                    if subject:
                        if self.debug:
                            print(f"Found conflict with subject: Day {day}, Period {period}, Subject: {subject}", file=sys.stderr)
                        class_info.add_conflict(day, period)
                    else:
                        # If no subject found, still add the conflict if it's a valid period
                        if self.debug:
                            print(f"Found conflict without subject: Day {day}, Period {period}", file=sys.stderr)
                        class_info.add_conflict(day, period)
            i += 1

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description='Parse master schedule PDF')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()

    try:
        pdf_parser = MasterScheduleParser(args.pdf_path)
        pdf_parser.debug = args.debug
        classes = pdf_parser.parse()
        
        # Convert to JSON-friendly format
        result = {
            'classes': [class_info.to_dict() for class_info in classes.values()]
        }
        
        # Output JSON to stdout
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 