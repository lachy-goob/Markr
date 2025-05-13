import xml.etree.ElementTree as ET
import random
from datetime import datetime, timedelta

def generate_random_datetime():
    """Generates a random datetime object."""
    start_date = datetime(2015, 1, 1, 0, 0, 0)
    end_date = datetime.now()
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    random_number_of_days = random.randrange(days_between_dates)
    random_date = start_date + timedelta(days=random_number_of_days,
                                         hours=random.randint(0, 23),
                                         minutes=random.randint(0, 59),
                                         seconds=random.randint(0, 59))
    # Ensure correct timezone format (+HH:MM)
    timezone_offset = timedelta(hours=random.randint(-11, 11))
    random_date_with_tz = random_date + timezone_offset
    return random_date_with_tz.strftime('%Y-%m-%dT%H:%M:%S') + '{:+03}:{:02}'.format(int(timezone_offset.total_seconds() // 3600), int((timezone_offset.total_seconds() % 3600) // 60))


def generate_first_name():
    """Generates a random first name."""
    first_names = ["Alex", "Jamie", "Chris", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Skyler", "Drew"]
    return random.choice(first_names)

def generate_last_name():
    """Generates a random last name."""
    last_names = ["Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson"]
    return random.choice(last_names)

def create_mcq_test_result(student_data, test_id_pool):
    """Creates a single mcq-test-result XML element."""
    mcq_test_result = ET.Element("mcq-test-result")
    scanned_on = generate_random_datetime()
    mcq_test_result.set("scanned-on", scanned_on)

    first_name_elem = ET.SubElement(mcq_test_result, "first-name")
    first_name_elem.text = student_data["first_name"]

    last_name_elem = ET.SubElement(mcq_test_result, "last-name")
    last_name_elem.text = student_data["last_name"]

    student_number_elem = ET.SubElement(mcq_test_result, "student-number")
    student_number_elem.text = student_data["student_number"]

    test_id_elem = ET.SubElement(mcq_test_result, "test-id")
    test_id_elem.text = student_data["test_id"]

    summary_marks_elem = ET.SubElement(mcq_test_result, "summary-marks")
    available_marks = random.randint(10, 100) # Random available marks
    obtained_marks = student_data["obtained_marks"]

    summary_marks_elem.set("available", str(available_marks))
    summary_marks_elem.set("obtained", str(obtained_marks))

    return mcq_test_result

def generate_xml_data(num_records):
    """Generates XML data with multiple mcq-test-result entries."""
    root = ET.Element("mcq-test-results")
    
    # Generate a pool of test IDs
    test_id_pool = [str(random.randint(1000, 99999)) for _ in range(max(10, num_records // 10))] # Ensure enough unique test IDs

    # Keep track of student numbers and their marks to handle duplicates
    student_marks_tracker = {} # {student_number: [obtained_mark1, obtained_mark2,...]}
    generated_records = 0

    while generated_records < num_records:
        student_number = str(random.randint(10000, 99999)).zfill(6)
        test_id = random.choice(test_id_pool)
        
        # Decide if this student is a duplicate or new
        # Introduce a chance for duplicates more often than purely random new numbers
        # to ensure "sometimes expected" duplicates
        make_duplicate = False
        if student_marks_tracker and random.random() < 0.25: # 25% chance to try making a duplicate if students exist
            possible_duplicates = list(student_marks_tracker.keys())
            if possible_duplicates:
                student_number = random.choice(possible_duplicates)
                make_duplicate = True

        first_name = generate_first_name()
        last_name = generate_last_name()
        
        # Determine obtained marks
        available_marks_for_current_test = random.randint(10,100) # This should align with how summary_marks are set in create_mcq_test_result
                                                               # For simplicity, we'll just generate a random obtained mark here.
                                                               # A more robust solution might tie this to the 'available' in summary-marks.
        
        if make_duplicate:
            existing_marks = student_marks_tracker[student_number]
            obtained_marks = random.randint(0, 50) # Assuming max obtained is 50 for this example
            # Ensure the new mark is different from existing ones for this student
            while obtained_marks in existing_marks:
                obtained_marks = random.randint(0, 50)
            student_marks_tracker[student_number].append(obtained_marks)
        else:
            obtained_marks = random.randint(0, 50)
            student_marks_tracker[student_number] = [obtained_marks]
            # For a new student, we might assign a new test ID or reuse one
            # The current logic already picks a random test_id from the pool for all cases

        student_data = {
            "first_name": first_name,
            "last_name": last_name,
            "student_number": student_number,
            "test_id": test_id,
            "obtained_marks": obtained_marks
        }
        
        mcq_result_element = create_mcq_test_result(student_data, test_id_pool)
        root.append(mcq_result_element)
        generated_records += 1

    # Beautify XML output (optional, but makes it readable)
    ET.indent(root, space="\t")
    return ET.tostring(root, encoding="unicode")

if __name__ == "__main__":
    num_records_to_generate = 5000 # Generate a random number of records up to 5000
    print(f"Generating {num_records_to_generate} MCQ test result records...")
    
    xml_output = generate_xml_data(num_records_to_generate)
    
    filename = "mcq_test_results_generated.xml"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(xml_output)
        
    print(f"Successfully generated {num_records_to_generate} records in {filename}")

    # Verification (optional):
    # You can parse the generated file and check for duplicate student numbers
    # and ensure their marks are different.
    try:
        tree = ET.parse(filename)
        root = tree.getroot()
        student_numbers_check = {}
        all_test_ids_present = True
        for result in root.findall('mcq-test-result'):
            s_num = result.find('student-number').text
            t_id = result.find('test-id').text
            mark = result.find('summary-marks').get('obtained')
            if not t_id:
                all_test_ids_present = False
            if s_num in student_numbers_check:
                if mark in student_numbers_check[s_num]:
                    print(f"Warning: Duplicate student {s_num} found with the SAME mark {mark}.")
                student_numbers_check[s_num].append(mark)
            else:
                student_numbers_check[s_num] = [mark]
        
        duplicates_found = any(len(marks) > 1 for marks in student_numbers_check.values())
        print(f"Verification: All entries have test-ids? {all_test_ids_present}")
        print(f"Verification: Duplicate student numbers found? {duplicates_found}")
        if duplicates_found:
            print("Sample of students with multiple entries (and their marks):")
            count = 0
            for s_num, marks in student_numbers_check.items():
                if len(marks) > 1 and count < 5:
                    print(f"  Student {s_num}: Marks {marks}")
                    count+=1

    except ET.ParseError as e:
        print(f"Error parsing the generated XML file: {e}")
    except FileNotFoundError:
        print(f"Generated file {filename} not found for verification.")