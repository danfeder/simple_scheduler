# PDF Parser Implementation

## Overview
The PDF parser is a critical component of the scheduler application, responsible for extracting class schedules and conflicts from the master schedule PDF. It has been implemented as a hybrid Python/TypeScript solution that provides reliable parsing with strong type safety.

## Current Implementation

### Architecture
- **Python Parser** (`python/pdf_parser/parser.py`): Core PDF parsing logic using `pdfplumber`
- **TypeScript Integration** (`src/services/pythonPdfParser.ts`): Node.js bridge to Python parser
- **Validation Script** (`src/services/validatePdf.ts`): Testing and validation utilities

### Key Features
1. **Accurate Class Identification**
   - Parses class identifiers (e.g., "PK207", "K-311", "4-509")
   - Validates class format against grade-level patterns
   - Handles multi-grade classes (e.g., "K/1/2-417")

2. **Conflict Detection**
   - Identifies subject-based conflicts (e.g., "Tech 2", "Lib 3")
   - Handles multiple conflicts per day
   - Maps conflicts to correct days using column detection
   - Supports all period numbers (1-8)

3. **Data Validation**
   - Grade level validation against class identifiers
   - Period number validation (1-8)
   - Conflict uniqueness checking
   - Grade distribution statistics

### Supported Formats
- Pre-K classes: `PK\d{3}` (e.g., PK207)
- Kindergarten: `K-\d{3}` (e.g., K-311)
- Grades 1-5: `\d-\d{3}` (e.g., 4-509)
- Multiple grades: `[K\d]/[K\d]/[K\d]-\d{3}` (e.g., K/1/2-417)

## Recent Improvements
1. **Parser Accuracy**
   - Fixed class identifier recognition
   - Improved day column detection with tolerance-based approach
   - Enhanced conflict detection for multiple periods per day
   - Better handling of subject-period associations

2. **Data Structure**
   - Simplified class representation
   - Removed redundant room number field
   - Improved conflict storage format

3. **Validation**
   - Added detailed debug output
   - Enhanced error reporting
   - Added statistics generation

## Next Steps

### Short Term
1. **Error Handling**
   - Add more detailed error messages
   - Implement recovery strategies for parsing failures
   - Add validation for edge cases

2. **Performance**
   - Optimize text extraction parameters
   - Cache parsed results
   - Add batch processing capability

3. **Testing**
   - Add unit tests for parser components
   - Create test suite with sample PDFs
   - Add integration tests for Python-TypeScript bridge

### Medium Term
1. **UI Integration**
   - Add preview of parsed results
   - Implement manual correction interface
   - Add conflict visualization

2. **Data Management**
   - Implement versioning for parsed schedules
   - Add diff visualization between versions
   - Support for schedule updates

3. **Validation Features**
   - Add conflict validation rules
   - Implement schedule consistency checks
   - Add reporting for unusual patterns

### Long Term
1. **Format Support**
   - Support for different PDF layouts
   - Handle multiple schedule formats
   - Add support for other input formats (Excel, etc.)

2. **Machine Learning**
   - Train model for improved text extraction
   - Implement pattern recognition for layouts
   - Add automatic format detection

3. **Integration**
   - API for external systems
   - Batch processing service
   - Real-time parsing updates

## Known Limitations
1. Requires specific PDF format and layout
2. Sensitive to changes in column positioning
3. Limited support for non-standard class identifiers
4. No support for schedule annotations or notes

## Contributing
When making changes to the parser:
1. Run the validation script to verify accuracy
2. Update tests if behavior changes
3. Document any new limitations or requirements
4. Update this documentation with significant changes 