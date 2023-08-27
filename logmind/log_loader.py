
import os


def find_paths(path, ext):
    paths = []
    for (root, dirs, file) in os.walk(path):
        for f in file:
            if ext in f:
                paths.append(os.path.join(root, f))
    return paths