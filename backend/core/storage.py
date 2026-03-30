import os
from pathlib import PurePath

from django.core.exceptions import SuspiciousFileOperation
from django.core.files.utils import validate_file_name
from django.utils.deconstruct import deconstructible
from storages.backends.s3boto3 import S3Boto3Storage


@deconstructible
class SupabaseNoHeadS3Storage(S3Boto3Storage):
    """
    Supabase's S3 compatibility layer rejects the HeadObject probe used by
    django-storages to find an available filename. Our upload paths already use
    UUID names, so we can safely skip that existence check.
    """

    def get_available_name(self, name, max_length=None):
        name = str(name).replace("\\", "/")
        dir_name, file_name = os.path.split(name)

        if ".." in PurePath(dir_name).parts:
            raise SuspiciousFileOperation(
                "Detected path traversal attempt in '%s'" % dir_name
            )

        validate_file_name(file_name)

        if max_length is not None and len(name) > max_length:
            raise SuspiciousFileOperation(
                "Storage can not find an available filename for '%s'." % name
            )

        return name
