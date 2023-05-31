import os


def add_url_to_file(file_path, directory_path, beginning_to_strip):
    # Get the file basename without extension
    file_name = os.path.splitext(os.path.basename(file_path))[0]

    # Construct the line to be added
    url = f"{directory_path}/{file_name}"
    url = url.lstrip(beginning_to_strip)
    url = f'url: "{url}"'

    # Read the contents of the file
    with open(file_path, "r") as file:
        lines = file.readlines()

    # Find the second occurrence of '---' in the file
    second_dash_index = None
    count = 0
    for i, line in enumerate(lines):
        if line.strip() == "---":
            count += 1
            if count == 2:
                second_dash_index = i
                break

    if second_dash_index is not None:
        # Insert the line just before the second '---'
        lines.insert(second_dash_index, url + "\n")

        # Write the modified contents back to the file
        with open(file_path, "w") as file:
            file.writelines(lines)


def iterate_directory(directory_path):
    # Iterate over all files and directories in the given path
    for root, dirs, files in os.walk(directory_path):
        for file_name in files:
            file_path = os.path.join(root, file_name)
            add_url_to_file(file_path, root, directory_path)


# Get the path of the script's directory
script_directory_path = os.path.dirname(os.path.abspath(__file__))

# Example usage
iterate_directory(script_directory_path)
